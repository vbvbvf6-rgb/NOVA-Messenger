import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const systemAnnouncementsTable = pgTable("system_announcements", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
