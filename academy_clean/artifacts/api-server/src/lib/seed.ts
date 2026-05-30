import { User } from "@workspace/db";
  import bcrypt from "bcryptjs";
  import { randomUUID } from "crypto";

  export async function seedAdmin(): Promise<void> {
    const email = "admin123@gmail.com";
    const password = "admin12345@@";
    try {
      const existing = await User.findOne({ email }).lean() as any;
      if (!existing) {
        const id = randomUUID();
        const passwordHash = await bcrypt.hash(password, 10);
        await User.create({
          _id: id, clerkId: id,
          name: "مسؤول النظام", username: "admin123",
          email, passwordHash, role: "admin",
        });
      } else if (!existing.passwordHash) {
        const passwordHash = await bcrypt.hash(password, 10);
        await User.findOneAndUpdate({ email }, { $set: { passwordHash, role: "admin" } });
      }
    } catch (err: unknown) {
      console.error("Admin seed failed:", err);
    }
  }
  