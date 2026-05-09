import { db, giftItemsTable, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";

const hash = (pass: string) => createHash("sha256").update(pass).digest("hex");

const GIFT_CATALOG = [
  // ── COMMON (50–175 ⚡) ─────────────────────────────────────────────────
  { name: "Сердечко",        emoji: "❤️",  animationType: "hearts",    rarity: "common",    stars: 1,  price: 50,    description: "Тёплое сердечко для близкого человека" },
  { name: "Звёздочка",       emoji: "⭐",  animationType: "stars",     rarity: "common",    stars: 1,  price: 50,    description: "Маленькая, но яркая звезда" },
  { name: "Цветок сакуры",   emoji: "🌸",  animationType: "confetti",  rarity: "common",    stars: 1,  price: 75,    description: "Нежный цветок весны" },
  { name: "Пончик",          emoji: "🍩",  animationType: "bounce",    rarity: "common",    stars: 1,  price: 75,    description: "Сладкий пончик на удачу" },
  { name: "Котёнок",         emoji: "🐱",  animationType: "hearts",    rarity: "common",    stars: 2,  price: 125,   description: "Самый милый котёнок" },
  { name: "Воздушный шар",   emoji: "🎈",  animationType: "balloons",  rarity: "common",    stars: 2,  price: 125,   description: "Праздничный воздушный шарик" },
  { name: "Четырёхлистник",  emoji: "🍀",  animationType: "confetti",  rarity: "common",    stars: 2,  price: 100,   description: "Клевер — символ удачи" },
  { name: "Пицца",           emoji: "🍕",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 150,   description: "Кусочек дружбы и тепла" },
  { name: "Торт",            emoji: "🎂",  animationType: "confetti",  rarity: "common",    stars: 2,  price: 175,   description: "Праздничный торт" },
  { name: "Луна",            emoji: "🌙",  animationType: "sparkle",   rarity: "common",    stars: 2,  price: 100,   description: "Ночная луна светит только тебе" },

  // ── RARE (500–2000 ⚡) ─────────────────────────────────────────────────
  { name: "Корона",          emoji: "👑",  animationType: "sparkle",   rarity: "rare",      stars: 3,  price: 500,   description: "Почувствуй себя королём" },
  { name: "Красная роза",    emoji: "🌹",  animationType: "hearts",    rarity: "rare",      stars: 3,  price: 750,   description: "Алая роза — символ страсти" },
  { name: "Лиса",            emoji: "🦊",  animationType: "bounce",    rarity: "rare",      stars: 3,  price: 625,   description: "Хитрая и обаятельная лиса" },
  { name: "Бриллиант",       emoji: "💎",  animationType: "diamonds",  rarity: "rare",      stars: 4,  price: 1000,  description: "Сверкающий бриллиант" },
  { name: "Ракета",          emoji: "🚀",  animationType: "lightning", rarity: "rare",      stars: 4,  price: 1250,  description: "В небо и выше!" },
  { name: "Гитара",          emoji: "🎸",  animationType: "sparkle",   rarity: "rare",      stars: 4,  price: 1000,  description: "Рок-н-ролл навсегда" },
  { name: "Кубок",           emoji: "🏆",  animationType: "fireworks", rarity: "rare",      stars: 5,  price: 1750,  description: "Ты настоящий победитель" },
  { name: "Радуга",          emoji: "🌈",  animationType: "confetti",  rarity: "rare",      stars: 4,  price: 875,   description: "Яркая радуга после дождя" },
  { name: "Молния",          emoji: "⚡",  animationType: "lightning", rarity: "rare",      stars: 5,  price: 1500,  description: "Электрическая энергия" },
  { name: "Самоцвет",        emoji: "🏅",  animationType: "sparkle",   rarity: "rare",      stars: 5,  price: 2000,  description: "Редкий самоцвет" },

  // ── EPIC (3000–12000 ⚡) ───────────────────────────────────────────────
  { name: "Дракон",          emoji: "🐉",  animationType: "flame",     rarity: "epic",      stars: 6,  price: 3000,  description: "Могущественный огнедышащий дракон" },
  { name: "Единорог",        emoji: "🦄",  animationType: "magic",     rarity: "epic",      stars: 7,  price: 5000,  description: "Магический единорог из легенд" },
  { name: "Феникс",          emoji: "🦅",  animationType: "flame",     rarity: "epic",      stars: 7,  price: 6000,  description: "Птица феникс — возрождение" },
  { name: "Планета",         emoji: "🪐",  animationType: "galaxy",    rarity: "epic",      stars: 8,  price: 7500,  description: "Далёкая загадочная планета" },
  { name: "Волшебство",      emoji: "🪄",  animationType: "magic",     rarity: "epic",      stars: 8,  price: 9000,  description: "Исполни любое желание" },
  { name: "Кристалл",        emoji: "🔮",  animationType: "galaxy",    rarity: "epic",      stars: 9,  price: 12000, description: "Магический предсказательный шар" },

  // ── LEGENDARY (25000–250000 ⚡) ────────────────────────────────────────
  { name: "Галактика",       emoji: "🌌",  animationType: "galaxy",    rarity: "legendary", stars: 12, price: 25000,  description: "Целая галактика в твоих руках" },
  { name: "Ангел",           emoji: "👼",  animationType: "magic",     rarity: "legendary", stars: 15, price: 50000,  description: "Небесный ангел-хранитель" },
  { name: "Пульс",           emoji: "💜",  animationType: "fireworks", rarity: "legendary", stars: 20, price: 100000, description: "Символ мессенджера Pulse" },
  { name: "Звезда",          emoji: "🌟",  animationType: "stars",     rarity: "legendary", stars: 25, price: 150000, description: "Легендарная путеводная звезда" },
  { name: "Бесконечность",   emoji: "♾️",  animationType: "galaxy",    rarity: "legendary", stars: 50, price: 250000, description: "Бесконечность и далее — высший подарок" },
];

const SYSTEM_USERS = [
  {
    username: "deepseek_ai",
    displayName: "DeepSeek AI",
    avatarColor: "#8B5CF6",
    avatarUrl: "/deepseek-avatar.jpg",
    isBot: true,
    isVerified: true,
    status: "online",
  },
  {
    username: "creater_messenger",
    displayName: "creater_messenger",
    avatarColor: "#F59E0B",
    isBot: false,
    isVerified: false,
    isAdmin: true,
    status: "online",
    password: "pulse2024",
  },
];

export async function runSeed() {
  // Upsert full gift catalog (name is the key)
  for (const item of GIFT_CATALOG) {
    const existing = await db.execute(
      sql`SELECT id FROM gift_items WHERE name = ${item.name} LIMIT 1`
    );
    if ((existing.rows as any[]).length === 0) {
      await db.execute(sql`
        INSERT INTO gift_items (name, emoji, animation_type, rarity, stars, price, description)
        VALUES (${item.name}, ${item.emoji}, ${item.animationType}, ${item.rarity},
                ${item.stars}, ${item.price}, ${item.description})
      `);
    } else {
      await db.execute(sql`
        UPDATE gift_items SET emoji=${item.emoji}, animation_type=${item.animationType},
          rarity=${item.rarity}, stars=${item.stars}, price=${item.price}, description=${item.description}
        WHERE name = ${item.name}
      `);
    }
  }
  const total = await db.execute(sql`SELECT COUNT(*) as cnt FROM gift_items`);
  console.log(`[seed] Gift catalog: ${(total.rows[0] as any).cnt} items`);

  // Ensure system users exist
  for (const u of SYSTEM_USERS) {
    const rows = await db.execute(sql`SELECT id FROM users WHERE username = ${u.username} LIMIT 1`);
    if ((rows.rows as any[]).length === 0) {
      const pwHash = (u as any).password ? hash((u as any).password) : null;
      await db.execute(sql`
        INSERT INTO users (username, display_name, avatar_color, avatar_url, status, is_bot, is_verified, is_admin, password_hash, balance)
        VALUES (
          ${u.username}, ${u.displayName}, ${u.avatarColor}, ${(u as any).avatarUrl ?? null}, ${u.status},
          ${u.isBot ?? false}, ${u.isVerified ?? false}, ${(u as any).isAdmin ?? false},
          ${pwHash}, 0
        )
      `);
      console.log(`[seed] Created user: ${u.username}`);
    } else if ((u as any).avatarUrl) {
      await db.execute(sql`UPDATE users SET avatar_url = ${(u as any).avatarUrl} WHERE username = ${u.username}`);
    }
  }

  // Ensure DeepSeek bot is in all non-bot users' contacts
  const bot = await db.execute(sql`SELECT id FROM users WHERE username = 'deepseek_ai' LIMIT 1`);
  const botId = (bot.rows as any[])[0]?.id;
  if (botId) {
    await db.execute(sql`
      INSERT INTO contacts (user_id, contact_id)
      SELECT u.id, ${botId} FROM users u
      WHERE u.is_bot = false AND u.id != ${botId}
        AND NOT EXISTS (SELECT 1 FROM contacts c WHERE c.user_id = u.id AND c.contact_id = ${botId})
    `);
  }
}
