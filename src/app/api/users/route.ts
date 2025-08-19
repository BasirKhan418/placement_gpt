import { NextResponse,NextRequest } from "next/server";
import { openDb } from "@/lib/db";
export const GET = async (req: NextRequest) => {
try{
    const db = await openDb();
    const users = await db.all("SELECT * FROM users");
    return NextResponse.json(users);
}catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
}
};
