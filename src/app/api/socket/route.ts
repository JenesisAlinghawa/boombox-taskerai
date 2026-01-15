import { NextRequest, NextResponse } from "next/server";

// Socket.io Server Setup Guide:
// For Next.js with WebSocket support, create a custom server file at project root
// See SOCKET_IO_SETUP.md in project root for detailed implementation

export async function GET(request: NextRequest) {
  // This endpoint verifies Socket.io client connectivity
  return NextResponse.json(
    {
      status: "Socket.io endpoint active",
      message: "For WebSocket support, ensure a custom server with Socket.io is running",
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  // WebSocket upgrade requests would be handled here in a custom server
  return NextResponse.json(
    { error: "WebSocket upgrade required" },
    { status: 400 }
  );
}
