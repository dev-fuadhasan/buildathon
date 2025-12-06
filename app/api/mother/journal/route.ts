import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getJournalEntry, saveJournalEntry, listJournalEntries, DailyJournalEntry } from "@/lib/data";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (date) {
      // Get specific date entry
      const entry = await getJournalEntry(user.id, date);
      return NextResponse.json({ entry });
    } else {
      // Get all entries
      const entries = await listJournalEntries(user.id);
      return NextResponse.json({ entries });
    }
  } catch (error: any) {
    console.error("Journal GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch journal entries" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { date, entry } = body;

    if (!date || !entry) {
      return NextResponse.json(
        { error: "Date and entry are required" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const journalEntry: DailyJournalEntry = {
      id: uuid(),
      motherId: user.id,
      date,
      entry: entry.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await saveJournalEntry(journalEntry);

    return NextResponse.json({ success: true, entry: journalEntry });
  } catch (error: any) {
    console.error("Journal POST error:", error);
    return NextResponse.json(
      { error: "Failed to save journal entry" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { date, entry } = body;

    if (!date || !entry) {
      return NextResponse.json(
        { error: "Date and entry are required" },
        { status: 400 }
      );
    }

    const existing = await getJournalEntry(user.id, date);
    if (!existing) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 }
      );
    }

    const updated: DailyJournalEntry = {
      ...existing,
      entry: entry.trim(),
      updatedAt: new Date().toISOString(),
    };

    await saveJournalEntry(updated);

    return NextResponse.json({ success: true, entry: updated });
  } catch (error: any) {
    console.error("Journal PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update journal entry" },
      { status: 500 }
    );
  }
}

