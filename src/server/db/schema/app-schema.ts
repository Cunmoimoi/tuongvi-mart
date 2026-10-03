import "server-only";
import { pgSchema } from "drizzle-orm/pg-core";

// Tách khỏi index.ts để các file bảng import được mà không tạo vòng import với index.
export const APP_SCHEMA = "app";
export const appSchema = pgSchema(APP_SCHEMA);
