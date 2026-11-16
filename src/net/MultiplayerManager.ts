import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

export interface PlayerState {
  x: number; y: number; z: number;
  yaw: number; pitch: number;
  health: number; maxHealth: number;
  weapon: string;
  name: string;
  color: number;
  dead: boolean;
}

export interface NetMessage {
  type: 'state' | 'shoot' | 'enemyHit' | 'enemyDead' | 'levelLoad' | 'playerHit' | 'chat' | 'playerJoined' | 'playerLeft' | 'grenade' | 'barrelExplode';
  from?: string;
  data?: any;
}

export type NetHandler = (msg: NetMessage) => void;

export class MultiplayerManager {
  private peer: Peer | null = null;
  private hostConn: DataConnection | null = null;
  private clientConns: Map<string, DataConnection> = new Map();
  isHost = false;
  myId = '';
  roomCode = '';
  connected = false;
  playerName = 'Player';
  playerColor = 0x00f0ff;
  private handlers: NetHandler[] = [];
  private stateTimer = 0;
  private pendingState: PlayerState | null = null;

  host(name: string, color: number): Promise<string> {
    this.playerName = name;
    this.playerColor = color;
    this.isHost = true;
    this.roomCode = this.generateRoomCode();

    return new Promise((resolve, reject) => {
      this.peer = new Peer(`nd-${this.roomCode}`, { debug: 0 });
      this.peer.on('open', (id) => {
        this.myId = id;
        this.connected = true;
        resolve(this.roomCode);
      });
      this.peer.on('error', (err) => {
        reject(err);
      });
      this.peer.on('connection', (conn) => {
        conn.on('open', () => {
          this.clientConns.set(conn.peer, conn);
          this.broadcast({ type: 'playerJoined', data: { id: conn.peer } });
        });
        conn.on('data', (data) => {
          const msg = data as NetMessage;
          if (msg.type === 'state' && msg.from) {
            for (const [, other] of this.clientConns) {
              if (other.peer !== msg.from) other.send(msg);
            }
          }
          this.emit(msg);
        });
        conn.on('close', () => {
          this.clientConns.delete(conn.peer);
          this.broadcast({ type: 'playerLeft', data: { id: conn.peer } });
          this.emit({ type: 'playerLeft', data: { id: conn.peer } });
        });
      });
    });
  }

  join(name: string, color: number, code: string): Promise<void> {
    this.playerName = name;
    this.playerColor = color;
    this.isHost = false;
    this.roomCode = code.toUpperCase();

    return new Promise((resolve, reject) => {
      this.peer = new Peer({ debug: 0 });
      this.peer.on('open', (id) => {
        this.myId = id;
        const hostId = `nd-${this.roomCode}`;
        this.hostConn = this.peer!.connect(hostId, { reliable: false });
        this.hostConn.on('open', () => {
          this.connected = true;
          this.hostConn!.send({ type: 'playerJoined', data: { id: this.myId, name: this.playerName, color: this.playerColor } });
          resolve();
        });
        this.hostConn.on('data', (data) => {
          this.emit(data as NetMessage);
        });
        this.hostConn.on('close', () => {
          this.connected = false;
          this.emit({ type: 'playerLeft', data: { id: 'host' } });
        });
        this.hostConn.on('error', () => {
          reject(new Error('Не удалось подключиться к хосту'));
        });
      });
      this.peer.on('error', (err) => {
        reject(err);
      });
    });
  }

  send(msg: NetMessage) {
    msg.from = this.myId;
    if (this.isHost) {
      this.broadcast(msg);
    } else if (this.hostConn && this.hostConn.open) {
      this.hostConn.send(msg);
    }
  }

  private broadcast(msg: NetMessage) {
    for (const [, conn] of this.clientConns) {
      if (conn.open) conn.send(msg);
    }
  }

  queueState(state: PlayerState) {
    this.pendingState = state;
  }

  flushState() {
    if (!this.pendingState || !this.connected) return;
    this.send({ type: 'state', data: this.pendingState });
    this.pendingState = null;
  }

  on(handler: NetHandler) {
    this.handlers.push(handler);
  }

  private emit(msg: NetMessage) {
    for (const h of this.handlers) h(msg);
  }

  getConnectedPlayers(): string[] {
    if (this.isHost) {
      return Array.from(this.clientConns.keys());
    }
    return this.hostConn && this.hostConn.open ? ['host'] : [];
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  disconnect() {
    if (this.hostConn) { this.hostConn.close(); this.hostConn = null; }
    for (const [, conn] of this.clientConns) conn.close();
    this.clientConns.clear();
    if (this.peer) { this.peer.destroy(); this.peer = null; }
    this.connected = false;
  }
}
