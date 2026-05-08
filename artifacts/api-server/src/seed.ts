import { db, giftItemsTable, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";

const hash = (pass: string) => createHash("sha256").update(pass).digest("hex");

const GIFT_CATALOG = [
  { name: "Сердечко", emoji: "❤️", animationType: "sparkle", rarity: "common", stars: 1, description: "Простое, но тёплое сердечко" },
  { name: "Звёздочка", emoji: "⭐", animationType: "sparkle", rarity: "common", stars: 1, description: "Маленькая звёздочка" },
  { name: "Цветок", emoji: "🌸", animationType: "float", rarity: "common", stars: 1, description: "Нежный цветок сакуры" },
  { name: "Смайл", emoji: "😊", animationType: "bounce", rarity: "common", stars: 1, description: "Приятная улыбка" },
  { name: "Снежинка", emoji: "❄️", animationType: "sparkle", rarity: "common", stars: 1, description: "Холодная снежинка" },
  { name: "Листик", emoji: "🍀", animationType: "float", rarity: "common", stars: 2, description: "Клевер на удачу" },
  { name: "Луна", emoji: "🌙", animationType: "float", rarity: "common", stars: 2, description: "Лунный свет" },
  { name: "Радуга", emoji: "🌈", animationType: "sparkle", rarity: "common", stars: 2, description: "Радужное настроение" },
  { name: "Корона", emoji: "👑", animationType: "sparkle", rarity: "rare", stars: 3, description: "Почувствуй себя королём" },
  { name: "Торт", emoji: "🎂", animationType: "bounce", rarity: "rare", stars: 3, description: "Праздничный торт" },
  { name: "Котик", emoji: "🐱", animationType: "bounce", rarity: "rare", stars: 3, description: "Милый котик" },
  { name: "Роза", emoji: "🌹", animationType: "float", rarity: "rare", stars: 4, description: "Красная роза" },
  { name: "Бриллиант", emoji: "💎", animationType: "sparkle", rarity: "rare", stars: 4, description: "Блестящий бриллиант" },
  { name: "Ракета", emoji: "🚀", animationType: "bounce", rarity: "rare", stars: 4, description: "В небо и выше" },
  { name: "Гитара", emoji: "🎸", animationType: "sparkle", rarity: "rare", stars: 5, description: "Рок-н-ролл навсегда" },
  { name: "Кубок", emoji: "🏆", animationType: "sparkle", rarity: "rare", stars: 5, description: "Ты победитель" },
  { name: "Дракон", emoji: "🐉", animationType: "explosion", rarity: "epic", stars: 6, description: "Могущественный дракон" },
  { name: "Единорог", emoji: "🦄", animationType: "sparkle", rarity: "epic", stars: 7, description: "Магический единорог" },
  { name: "Феникс", emoji: "🔥", animationType: "explosion", rarity: "epic", stars: 7, description: "Птица феникс возрождается" },
  { name: "Планета", emoji: "🪐", animationType: "orbit", rarity: "epic", stars: 8, description: "Далёкая планета" },
  { name: "Волшебная палочка", emoji: "🪄", animationType: "sparkle", rarity: "epic", stars: 8, description: "Исполни любое желание" },
  { name: "Кристалл", emoji: "🔮", animationType: "orbit", rarity: "epic", stars: 9, description: "Магический кристалл" },
  { name: "Золотой трофей", emoji: "🏅", animationType: "explosion", rarity: "legendary", stars: 10, description: "Легендарная награда" },
  { name: "Галактика", emoji: "🌌", animationType: "orbit", rarity: "legendary", stars: 12, description: "Целая галактика" },
  { name: "Ангел", emoji: "👼", animationType: "sparkle", rarity: "legendary", stars: 15, description: "Небесный ангел-хранитель" },
  { name: "Пульс", emoji: "💜", animationType: "explosion", rarity: "legendary", stars: 20, description: "Символ мессенджера Pulse" },
  { name: "Звезда смерти", emoji: "💫", animationType: "explosion", rarity: "legendary", stars: 25, description: "Легендарный подарок" },
  { name: "Infinity", emoji: "♾️", animationType: "orbit", rarity: "legendary", stars: 50, description: "Бесконечность и далее" },
];

const SYSTEM_USERS = [
  {
    username: "deepseek_ai",
    displayName: "DeepSeek AI",
    avatarColor: "#8B5CF6",
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
  // Seed gift catalog (only if empty)
  const existing = await db.select().from(giftItemsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(giftItemsTable).values(GIFT_CATALOG);
    console.log(`[seed] Inserted ${GIFT_CATALOG.length} gift items`);
  }

  // Ensure system users exist
  for (const u of SYSTEM_USERS) {
    const rows = await db.execute(sql`SELECT id FROM users WHERE username = ${u.username} LIMIT 1`);
    if ((rows.rows as any[]).length === 0) {
      const pwHash = (u as any).password ? hash((u as any).password) : null;
      await db.execute(sql`
        INSERT INTO users (username, display_name, avatar_color, status, is_bot, is_verified, is_admin, password_hash, balance)
        VALUES (
          ${u.username}, ${u.displayName}, ${u.avatarColor}, ${u.status},
          ${u.isBot ?? false}, ${u.isVerified ?? false}, ${(u as any).isAdmin ?? false},
          ${pwHash}, 0
        )
      `);
      console.log(`[seed] Created user: ${u.username}`);
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
