import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const wardrobe = sqliteTable('wardrobe', { id: text('id').primaryKey(), data: text('data').notNull(), revision: integer('revision').notNull().default(1) });
