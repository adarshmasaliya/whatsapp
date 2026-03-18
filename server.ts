import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';

const logger = pino({ level: 'silent' });
const JWT_SECRET = 'whatsapp-autosass-secret-key';

// In-memory stores
const users: any[] = [];
const sessions: Map<string, any> = new Map();
const rules: Map<string, any[]> = new Map(); // userId -> rules[]
const qrCodes: Map<string, string> = new Map(); // userId -> qrData
const logsStore: Map<string, any[]> = new Map(); // userId -> logs[]

// New stores for the requested features
const menus: Map<string, any[]> = new Map(); // userId -> menuConfigs[]
const bookings: Map<string, any[]> = new Map(); // userId -> bookings[]
const contacts: Map<string, any[]> = new Map(); // userId -> contacts[]
const chatState: Map<string, any> = new Map(); // remoteJid -> { userId, step, data, currentMenuId }
const messagesStore: Map<string, any[]> = new Map(); // userId -> messages[]

async function startServer() {
    const app = express();
    const PORT = 3000;

    app.use(cors());
    app.use(express.json());
    app.use(session({
        secret: 'session-secret',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
    }));

    // API routes go here
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', time: new Date().toISOString() });
    });

    // --- Auth Routes ---
    app.post('/api/register', async (req, res) => {
        const { email, password } = req.body;
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'User exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = { id: Date.now().toString(), email, password: hashedPassword };
        users.push(user);
        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        res.json({ token, user: { id: user.id, email: user.email } });
    });

    app.post('/api/login', async (req, res) => {
        const { email, password } = req.body;
        const user = users.find(u => u.email === email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        res.json({ token, user: { id: user.id, email: user.email } });
    });

    app.post('/api/guest', (req, res) => {
        const guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
        const token = jwt.sign({ userId: guestId }, JWT_SECRET);
        res.json({ token, user: { id: guestId, email: 'guest@example.com', name: 'Guest User' } });
    });

    // --- Middleware ---
    const authenticate = (req: any, res: any, next: any) => {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            req.userId = decoded.userId;
            next();
        } catch (e) {
            res.status(401).json({ error: 'Invalid token' });
        }
    };

    // --- WhatsApp Logic ---
    async function connectToWhatsApp(userId: string) {
        if (sessions.has(userId)) return;

        const sessionDir = path.join(process.cwd(), 'sessions', userId);
        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
        });

        sessions.set(userId, sock);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                const qrDataUrl = await QRCode.toDataURL(qr);
                qrCodes.set(userId, qrDataUrl);
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                qrCodes.delete(userId);
                sessions.delete(userId);
                if (shouldReconnect) connectToWhatsApp(userId);
            } else if (connection === 'open') {
                qrCodes.delete(userId);
                console.log(`WhatsApp connected for user: ${userId}`);
            }
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async (m) => {
            if (m.type !== 'notify') return;
            for (const msg of m.messages) {
                if (!msg.key.fromMe && msg.message) {
                    const remoteJid = msg.key.remoteJid!;
                    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                    const lowerText = text.toLowerCase().trim();

                    // Store message for Team Inbox
                    const userMessages = messagesStore.get(userId) || [];
                    userMessages.unshift({
                        id: msg.key.id,
                        from: remoteJid,
                        text,
                        time: new Date().toISOString(),
                        fromMe: false
                    });
                    messagesStore.set(userId, userMessages.slice(0, 100));

                    // Handle ongoing conversation state (Booking/Menu)
                    const state = chatState.get(remoteJid);

                    // 1. Booking Flow
                    if (state?.step === 'awaiting_booking_date') {
                        const dates = ['Monday', 'Tuesday', 'Wednesday'];
                        const selection = parseInt(lowerText);
                        if (selection >= 1 && selection <= 3) {
                            const date = dates[selection - 1];
                            chatState.set(remoteJid, { ...state, step: 'awaiting_booking_time', date });
                            await sock.sendMessage(remoteJid, { text: `Great! You selected ${date}. Now select a time:\n1️⃣ 10:00 AM\n2️⃣ 02:00 PM\n3️⃣ 04:00 PM` });
                        } else {
                            await sock.sendMessage(remoteJid, { text: 'Invalid selection. Please reply with 1, 2, or 3.' });
                        }
                        return;
                    }

                    if (state?.step === 'awaiting_booking_time') {
                        const times = ['10:00 AM', '02:00 PM', '04:00 PM'];
                        const selection = parseInt(lowerText);
                        if (selection >= 1 && selection <= 3) {
                            const time = times[selection - 1];
                            const userBookings = bookings.get(userId) || [];
                            userBookings.push({
                                id: Date.now().toString(),
                                phone: remoteJid.split('@')[0],
                                date: state.date,
                                time,
                                userId,
                                createdAt: new Date().toISOString()
                            });
                            bookings.set(userId, userBookings);
                            chatState.delete(remoteJid);
                            await sock.sendMessage(remoteJid, { text: `✅ Booking Confirmed!\nDate: ${state.date}\nTime: ${time}\nSee you then!` });
                        } else {
                            await sock.sendMessage(remoteJid, { text: 'Invalid selection. Please reply with 1, 2, or 3.' });
                        }
                        return;
                    }

                    // 2. Menu Flow
                    if (state?.step === 'awaiting_menu_selection') {
                        const userMenus = menus.get(userId) || [];
                        const currentMenu = userMenus.find(m => m.id === state.currentMenuId) || userMenus.find(m => m.isRoot);
                        
                        if (!currentMenu || !currentMenu.enabled) {
                            chatState.delete(remoteJid);
                            return;
                        }

                        const selectedOption = currentMenu.options?.find((o: any) => o.id === lowerText);

                        if (selectedOption) {
                            switch (selectedOption.action) {
                                case 'text':
                                case 'info':
                                    await sock.sendMessage(remoteJid, { text: selectedOption.value });
                                    chatState.delete(remoteJid);
                                    break;
                                case 'booking':
                                    chatState.set(remoteJid, { userId, step: 'awaiting_booking_date' });
                                    await sock.sendMessage(remoteJid, { text: 'Select a date:\n1️⃣ Monday\n2️⃣ Tuesday\n3️⃣ Wednesday' });
                                    break;
                                case 'submenu':
                                    const nextMenu = userMenus.find(m => m.id === selectedOption.value);
                                    if (nextMenu && nextMenu.enabled) {
                                        chatState.set(remoteJid, { userId, step: 'awaiting_menu_selection', currentMenuId: nextMenu.id });
                                        await sock.sendMessage(remoteJid, { text: nextMenu.text });
                                    } else {
                                        await sock.sendMessage(remoteJid, { text: 'Sorry, this menu is currently unavailable.' });
                                        chatState.delete(remoteJid);
                                    }
                                    break;
                                case 'support':
                                    await sock.sendMessage(remoteJid, { text: 'Transferring you to a human agent... Please wait.' });
                                    // In a real app, we'd flag this chat in the inbox
                                    chatState.delete(remoteJid);
                                    break;
                                default:
                                    await sock.sendMessage(remoteJid, { text: 'Action not implemented yet.' });
                                    chatState.delete(remoteJid);
                            }
                        } else {
                            await sock.sendMessage(remoteJid, { text: 'Invalid option. Please select a valid number from the menu.' });
                        }
                        return;
                    }

                    // 3. Trigger Menu
                    const userMenus = menus.get(userId) || [];
                    const rootMenu = userMenus.find(m => m.isRoot) || { 
                        id: 'root',
                        isRoot: true,
                        enabled: true,
                        trigger: 'menu', 
                        text: 'Welcome to our Business 👋\n\nPlease choose an option:\n\n1️⃣ Book Appointment\n2️⃣ View Price List\n3️⃣ Business Hours\n4️⃣ Talk to Support',
                        options: [
                            { id: '1', label: 'Book Appointment', action: 'booking' },
                            { id: '2', label: 'View Price List', action: 'text', value: 'Our Price List:\n- Basic: $10\n- Pro: $25\n- Enterprise: $100' },
                            { id: '3', label: 'Business Hours', action: 'info', value: 'We are open Mon-Fri, 9 AM - 6 PM.' },
                            { id: '4', label: 'Talk to Support', action: 'support' }
                        ]
                    };

                    if (lowerText === rootMenu.trigger?.toLowerCase() || lowerText === 'hi' || lowerText === 'hello') {
                        if (rootMenu.enabled) {
                            chatState.set(remoteJid, { userId, step: 'awaiting_menu_selection', currentMenuId: rootMenu.id });
                            await sock.sendMessage(remoteJid, { text: rootMenu.text });
                            return;
                        }
                    }

                    // 4. Trigger Booking directly
                    if (lowerText === 'book') {
                        chatState.set(remoteJid, { userId, step: 'awaiting_booking_date' });
                        await sock.sendMessage(remoteJid, { text: 'Select a date:\n1️⃣ Monday\n2️⃣ Tuesday\n3️⃣ Wednesday' });
                        return;
                    }

                    // 5. Auto Reply Rules (Keyword matching)
                    const userRules = rules.get(userId) || [];
                    const match = userRules.find(r => lowerText.includes(r.keyword.toLowerCase()));
                    
                    if (match) {
                        if (match.imageUrl) {
                            await sock.sendMessage(remoteJid, { 
                                image: { url: match.imageUrl }, 
                                caption: match.reply 
                            });
                        } else {
                            await sock.sendMessage(remoteJid, { text: match.reply });
                        }
                        
                        // Add to logs
                        const userLogs = logsStore.get(userId) || [];
                        userLogs.unshift({
                            id: Date.now().toString(),
                            time: new Date().toISOString(),
                            to: remoteJid,
                            msg: text,
                            reply: match.reply,
                            hasImage: !!match.imageUrl
                        });
                        logsStore.set(userId, userLogs.slice(0, 50));
                    }
                }
            }
        });
    }

    // --- API Routes ---
    app.get('/api/status', authenticate, (req: any, res) => {
        const sock = sessions.get(req.userId);
        const qr = qrCodes.get(req.userId);
        res.json({ 
            connected: !!sock && !qr, 
            qr: qr || null 
        });
    });

    app.post('/api/connect', authenticate, (req: any, res) => {
        connectToWhatsApp(req.userId);
        res.json({ message: 'Connection initiated' });
    });

    app.post('/api/disconnect', authenticate, async (req: any, res) => {
        const sock = sessions.get(req.userId);
        if (sock) {
            try {
                await sock.logout();
            } catch (e) {}
            sessions.delete(req.userId);
        }
        qrCodes.delete(req.userId);
        
        const sessionDir = path.join(process.cwd(), 'sessions', req.userId);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
        
        res.json({ message: 'Disconnected' });
    });

    app.get('/api/logs', authenticate, (req: any, res) => {
        res.json(logsStore.get(req.userId) || []);
    });

    // --- Rules API ---
    app.get('/api/rules', authenticate, (req: any, res) => {
        res.json(rules.get(req.userId) || []);
    });

    app.post('/api/rules', authenticate, (req: any, res) => {
        const { keyword, reply, imageUrl } = req.body;
        const userRules = rules.get(req.userId) || [];
        userRules.push({ 
            id: Date.now().toString(), 
            keyword, 
            reply, 
            imageUrl: imageUrl || null 
        });
        rules.set(req.userId, userRules);
        res.json(userRules);
    });

    app.delete('/api/rules/:id', authenticate, (req: any, res) => {
        const userRules = rules.get(req.userId) || [];
        const filtered = userRules.filter(r => r.id !== req.params.id);
        rules.set(req.userId, filtered);
        res.json(filtered);
    });

    // --- Menu API ---
    app.get('/api/menu', authenticate, (req: any, res) => {
        const userMenus = menus.get(req.userId) || [];
        if (userMenus.length === 0) {
            // Default root menu
            const defaultMenu = { 
                id: 'root',
                name: 'Main Menu',
                isRoot: true,
                enabled: true,
                trigger: 'menu', 
                text: 'Welcome to our Business 👋\n\nPlease choose an option:\n\n1️⃣ Book Appointment\n2️⃣ View Price List\n3️⃣ Business Hours\n4️⃣ Talk to Support',
                options: [
                    { id: '1', label: 'Book Appointment', action: 'booking' },
                    { id: '2', label: 'View Price List', action: 'text', value: 'Our Price List:\n- Basic: $10\n- Pro: $25\n- Enterprise: $100' },
                    { id: '3', label: 'Business Hours', action: 'info', value: 'We are open Mon-Fri, 9 AM - 6 PM.' },
                    { id: '4', label: 'Talk to Support', action: 'support' }
                ]
            };
            return res.json([defaultMenu]);
        }
        res.json(userMenus);
    });

    app.post('/api/menu', authenticate, (req: any, res) => {
        const userMenus = req.body; // Expecting array of menus
        menus.set(req.userId, userMenus);
        res.json(userMenus);
    });

    // --- Bookings API ---
    app.get('/api/bookings', authenticate, (req: any, res) => {
        res.json(bookings.get(req.userId) || []);
    });

    // --- Broadcast API ---
    app.post('/api/broadcast', authenticate, async (req: any, res) => {
        const { message, recipients } = req.body; // recipients is array of strings
        const sock = sessions.get(req.userId);
        if (!sock) return res.status(400).json({ error: 'WhatsApp not connected' });

        for (const phone of recipients) {
            try {
                const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
                await sock.sendMessage(jid, { text: message });
            } catch (e) {
                console.error(`Failed to send broadcast to ${phone}`);
            }
        }
        res.json({ message: 'Broadcast sent' });
    });

    // --- Inbox API ---
    app.get('/api/messages', authenticate, (req: any, res) => {
        res.json(messagesStore.get(req.userId) || []);
    });

    app.post('/api/messages/reply', authenticate, async (req: any, res) => {
        const { to, text } = req.body;
        const sock = sessions.get(req.userId);
        if (!sock) return res.status(400).json({ error: 'WhatsApp not connected' });

        try {
            await sock.sendMessage(to, { text });
            const userMessages = messagesStore.get(req.userId) || [];
            userMessages.unshift({
                id: Date.now().toString(),
                from: to,
                text,
                time: new Date().toISOString(),
                fromMe: true
            });
            messagesStore.set(req.userId, userMessages.slice(0, 100));
            res.json({ message: 'Reply sent' });
        } catch (e) {
            res.status(500).json({ error: 'Failed to send reply' });
        }
    });

    // --- Vite Setup ---
    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    } else {
        app.use(express.static(path.join(process.cwd(), 'dist')));
        app.get('*', (req, res) => {
            res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
        });
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();
