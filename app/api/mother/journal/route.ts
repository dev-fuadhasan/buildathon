import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDailyEntry, saveDailyEntry, listDailyEntries, listDailyEntriesByDate, deleteDailyEntry, DailyEntry } from "@/lib/data";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const entryId = searchParams.get("entryId");

    if (entryId) {
      // Get specific entry by ID
      const entry = await getDailyEntry(user.id, entryId);
      if (!entry) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 });
      }
      return NextResponse.json({ entry });
    } else if (date) {
      // Get all entries for a specific date
      const entries = await listDailyEntriesByDate(user.id, date);
      return NextResponse.json({ entries });
    } else {
      // Get all entries
      const entries = await listDailyEntries(user.id);
      return NextResponse.json({ entries });
    }
  } catch (error: any) {
    console.error("Daily Entry GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily entries" },
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
    const dailyEntry: DailyEntry = {
      id: uuid(),
      motherId: user.id,
      date,
      entry: entry.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await saveDailyEntry(dailyEntry);

    return NextResponse.json({ success: true, entry: dailyEntry });
  } catch (error: any) {
    console.error("Daily Entry POST error:", error);
    return NextResponse.json(
      { error: "Failed to save daily entry" },
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
    const { entryId, entry } = body;

    if (!entryId || !entry) {
      return NextResponse.json(
        { error: "Entry ID and entry are required" },
        { status: 400 }
      );
    }

    const existing = await getDailyEntry(user.id, entryId);
    if (!existing) {
      return NextResponse.json(
        { error: "Daily entry not found" },
        { status: 404 }
      );
    }

    const updated: DailyEntry = {
      ...existing,
      entry: entry.trim(),
      updatedAt: new Date().toISOString(),
    };

    await saveDailyEntry(updated);

    return NextResponse.json({ success: true, entry: updated });
  } catch (error: any) {
    console.error("Daily Entry PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update daily entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "mother") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entryId = searchParams.get("entryId");

    if (!entryId) {
      return NextResponse.json(
        { error: "Entry ID is required" },
        { status: 400 }
      );
    }

    const existing = await getDailyEntry(user.id, entryId);
    if (!existing) {
      return NextResponse.json(
        { error: "Daily entry not found" },
        { status: 404 }
      );
    }

    await deleteDailyEntry(user.id, entryId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Daily Entry DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete daily entry" },
      { status: 500 }
    );
  }
}
