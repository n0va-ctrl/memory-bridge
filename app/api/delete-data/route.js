import fs from "fs";
import path from "path";

export async function POST() {
  try {
    const filePath = path.join(process.cwd(), "data", "patientMemory.json");
    fs.writeFileSync(filePath, "[]");
    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return Response.json({ error: "Failed to delete" }, { status: 500 });
  }
}