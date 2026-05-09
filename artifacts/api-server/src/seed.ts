import { db, giftItemsTable, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";

const hash = (pass: string) => createHash("sha256").update(pass).digest("hex");

const GIFT_CATALOG = [
  // ── COMMON (25–90 ⚡) ──────────────────────────────────────────────────
  { name: "Сердечко",        emoji: "❤️",  animationType: "hearts",    rarity: "common",    stars: 1,  price: 25,    description: "Тёплое сердечко для близкого человека" },
  { name: "Звёздочка",       emoji: "⭐",  animationType: "stars",     rarity: "common",    stars: 1,  price: 25,    description: "Маленькая, но яркая звезда" },
  { name: "Цветок сакуры",   emoji: "🌸",  animationType: "confetti",  rarity: "common",    stars: 1,  price: 40,    description: "Нежный цветок весны" },
  { name: "Пончик",          emoji: "🍩",  animationType: "bounce",    rarity: "common",    stars: 1,  price: 40,    description: "Сладкий пончик на удачу" },
  { name: "Котёнок",         emoji: "🐱",  animationType: "hearts",    rarity: "common",    stars: 2,  price: 60,    description: "Самый милый котёнок" },
  { name: "Воздушный шар",   emoji: "🎈",  animationType: "balloons",  rarity: "common",    stars: 2,  price: 60,    description: "Праздничный воздушный шарик" },
  { name: "Четырёхлистник",  emoji: "🍀",  animationType: "confetti",  rarity: "common",    stars: 2,  price: 50,    description: "Клевер — символ удачи" },
  { name: "Пицца",           emoji: "🍕",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 75,    description: "Кусочек дружбы и тепла" },
  { name: "Торт",            emoji: "🎂",  animationType: "confetti",  rarity: "common",    stars: 2,  price: 90,    description: "Праздничный торт" },
  { name: "Луна",            emoji: "🌙",  animationType: "sparkle",   rarity: "common",    stars: 2,  price: 50,    description: "Ночная луна светит только тебе" },

  // ── RARE (250–1000 ⚡) ─────────────────────────────────────────────────
  { name: "Корона",          emoji: "👑",  animationType: "sparkle",   rarity: "rare",      stars: 3,  price: 250,   description: "Почувствуй себя королём" },
  { name: "Красная роза",    emoji: "🌹",  animationType: "hearts",    rarity: "rare",      stars: 3,  price: 375,   description: "Алая роза — символ страсти" },
  { name: "Лиса",            emoji: "🦊",  animationType: "bounce",    rarity: "rare",      stars: 3,  price: 310,   description: "Хитрая и обаятельная лиса" },
  { name: "Бриллиант",       emoji: "💎",  animationType: "diamonds",  rarity: "rare",      stars: 4,  price: 500,   description: "Сверкающий бриллиант" },
  { name: "Ракета",          emoji: "🚀",  animationType: "lightning", rarity: "rare",      stars: 4,  price: 625,   description: "В небо и выше!" },
  { name: "Гитара",          emoji: "🎸",  animationType: "sparkle",   rarity: "rare",      stars: 4,  price: 500,   description: "Рок-н-ролл навсегда" },
  { name: "Кубок",           emoji: "🏆",  animationType: "fireworks", rarity: "rare",      stars: 5,  price: 875,   description: "Ты настоящий победитель" },
  { name: "Радуга",          emoji: "🌈",  animationType: "confetti",  rarity: "rare",      stars: 4,  price: 440,   description: "Яркая радуга после дождя" },
  { name: "Молния",          emoji: "⚡",  animationType: "lightning", rarity: "rare",      stars: 5,  price: 750,   description: "Электрическая энергия" },
  { name: "Самоцвет",        emoji: "🏅",  animationType: "sparkle",   rarity: "rare",      stars: 5,  price: 1000,  description: "Редкий самоцвет" },

  // ── EPIC (1500–6000 ⚡) ────────────────────────────────────────────────
  { name: "Дракон",          emoji: "🐉",  animationType: "flame",     rarity: "epic",      stars: 6,  price: 1500,  description: "Могущественный огнедышащий дракон" },
  { name: "Единорог",        emoji: "🦄",  animationType: "magic",     rarity: "epic",      stars: 7,  price: 2500,  description: "Магический единорог из легенд" },
  { name: "Феникс",          emoji: "🦅",  animationType: "flame",     rarity: "epic",      stars: 7,  price: 3000,  description: "Птица феникс — возрождение" },
  { name: "Планета",         emoji: "🪐",  animationType: "galaxy",    rarity: "epic",      stars: 8,  price: 3750,  description: "Далёкая загадочная планета" },
  { name: "Волшебство",      emoji: "🪄",  animationType: "magic",     rarity: "epic",      stars: 8,  price: 4500,  description: "Исполни любое желание" },
  { name: "Кристалл",        emoji: "🔮",  animationType: "galaxy",    rarity: "epic",      stars: 9,  price: 6000,  description: "Магический предсказательный шар" },

  // ── LEGENDARY (12500–125000 ⚡) ────────────────────────────────────────
  { name: "Галактика",       emoji: "🌌",  animationType: "galaxy",    rarity: "legendary", stars: 12, price: 12500,  description: "Целая галактика в твоих руках" },
  { name: "Ангел",           emoji: "👼",  animationType: "magic",     rarity: "legendary", stars: 15, price: 25000,  description: "Небесный ангел-хранитель" },
  { name: "Пульс",           emoji: "💜",  animationType: "fireworks", rarity: "legendary", stars: 20, price: 50000,  description: "Символ мессенджера Pulse" },
  { name: "Звезда",          emoji: "🌟",  animationType: "stars",     rarity: "legendary", stars: 25, price: 75000,  description: "Легендарная путеводная звезда" },
  { name: "Бесконечность",   emoji: "♾️",  animationType: "galaxy",    rarity: "legendary", stars: 50, price: 125000, description: "Бесконечность и далее — высший подарок" },

  // ── COSMIC (150000–500000 ⚡) ──────────────────────────────────────────
  { name: "Нейтронная звезда", emoji: "💥", animationType: "supernova", rarity: "cosmic", stars: 60,  price: 150000,  description: "Сверхплотная звезда с невероятной энергией" },
  { name: "Квазар",            emoji: "🌠", animationType: "supernova", rarity: "cosmic", stars: 75,  price: 250000,  description: "Мощнейший источник света во вселенной" },
  { name: "Чёрная дыра",       emoji: "🌀", animationType: "vortex",    rarity: "cosmic", stars: 90,  price: 375000,  description: "Точка, из которой нет возврата" },
  { name: "Мультивселенная",   emoji: "🪩", animationType: "vortex",    rarity: "cosmic", stars: 99,  price: 450000,  description: "Бесконечное множество параллельных миров" },
  { name: "Абсолют",           emoji: "⚜️", animationType: "supernova", rarity: "cosmic", stars: 100, price: 500000,  description: "Абсолютное совершенство — предел возможного" },

  // ── PRIME EXCLUSIVE ────────────────────────────────────────────────────
  { name: "Корона Prime",       emoji: "👑", animationType: "magic",     rarity: "epic",      stars: 10, price: 5000,  description: "Эксклюзивная корона для избранных Prime-участников", primeOnly: true },
  { name: "Пульс Сердца",       emoji: "💜", animationType: "hearts",    rarity: "legendary", stars: 18, price: 30000, description: "Бьющийся пульс — символ вечной связи Prime", primeOnly: true },
  { name: "Звезда Prime",       emoji: "⭐", animationType: "stars",     rarity: "legendary", stars: 22, price: 55000, description: "Эксклюзивная звезда — только для Prime-участников", primeOnly: true },
  { name: "Вселенский Огонь",   emoji: "🔥", animationType: "flame",     rarity: "cosmic",    stars: 80, price: 300000, description: "Огонь, что горит вечно — особый дар Prime", primeOnly: true },

  // ── ULTRA (750000–1000000 ⚡) ──────────────────────────────────────────
  { name: "Сингулярность",      emoji: "💠", animationType: "vortex",    rarity: "cosmic",    stars: 150, price: 750000,  description: "Точка начала всего — бесконечная плотность бытия" },
  { name: "Создатель",          emoji: "🌐", animationType: "supernova", rarity: "cosmic",    stars: 200, price: 1000000, description: "Высший подарок вселенной — тот, кто создал всё сущее" },
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
        INSERT INTO gift_items (name, emoji, animation_type, rarity, stars, price, description, prime_only)
        VALUES (${item.name}, ${item.emoji}, ${item.animationType}, ${item.rarity},
                ${item.stars}, ${item.price}, ${item.description}, ${(item as any).primeOnly ?? false})
      `);
    } else {
      await db.execute(sql`
        UPDATE gift_items SET emoji=${item.emoji}, animation_type=${item.animationType},
          rarity=${item.rarity}, stars=${item.stars}, price=${item.price}, description=${item.description},
          prime_only=${(item as any).primeOnly ?? false}
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
