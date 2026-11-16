import { QUESTS } from '../data/quests';
import type { QuestDef, QuestState, QuestStatus, Objective } from '../types/common';

export class QuestSystem {
  states: Map<string, QuestState> = new Map();
  onQuestActivated: ((q: QuestDef) => void) | null = null;
  onQuestCompleted: ((q: QuestDef) => void) | null = null;
  onObjectiveUpdated: ((q: QuestDef) => void) | null = null;

  init() {
    this.states.clear();
    for (const q of QUESTS) {
      const status: QuestStatus = q.prerequisites.length === 0 ? 'available' : 'locked';
      this.states.set(q.id, {
        id: q.id,
        status,
        objectives: q.objectives.map((o) => ({ ...o, current: 0, done: false })),
      });
    }
    this.checkAvailability();
  }

  private def(id: string): QuestDef | undefined { return QUESTS.find((q) => q.id === id); }

  checkAvailability() {
    for (const q of QUESTS) {
      const st = this.states.get(q.id);
      if (!st || st.status !== 'locked') continue;
      const ready = q.prerequisites.every((p) => this.states.get(p)?.status === 'completed');
      if (ready) {
        st.status = 'available';
      }
    }
  }

  activate(id: string): boolean {
    const st = this.states.get(id);
    const def = this.def(id);
    if (!st || !def || st.status !== 'available') return false;
    st.status = 'active';
    this.onQuestActivated?.(def);
    return true;
  }

  autoActivateFirst(): string | null {
    for (const q of QUESTS) {
      const st = this.states.get(q.id);
      if (st && st.status === 'available') {
        this.activate(q.id);
        return q.id;
      }
    }
    return null;
  }

  getActiveMain(): QuestDef | null {
    for (const q of QUESTS) {
      if (q.main && this.states.get(q.id)?.status === 'active') return q;
    }
    return null;
  }

  getActiveAll(): QuestDef[] {
    return QUESTS.filter((q) => this.states.get(q.id)?.status === 'active');
  }

  progressKill(target: string) {
    for (const q of QUESTS) {
      const st = this.states.get(q.id);
      if (!st || st.status !== 'active') continue;
      for (const o of st.objectives) {
        if (o.type === 'kill' && o.target === target && !o.done) {
          o.current = (o.current || 0) + 1;
          if (o.current >= (o.count || 1)) o.done = true;
          this.onObjectiveUpdated?.(q);
        }
      }
      this.checkComplete(q.id);
    }
  }

  progressInteract(target: string) {
    for (const q of QUESTS) {
      const st = this.states.get(q.id);
      if (!st || st.status !== 'active') continue;
      for (const o of st.objectives) {
        if (o.type === 'interact' && o.target === target && !o.done) {
          o.current = 1; o.done = true;
          this.onObjectiveUpdated?.(q);
        }
      }
      this.checkComplete(q.id);
    }
  }

  progressCollect(target: string) {
    for (const q of QUESTS) {
      const st = this.states.get(q.id);
      if (!st || st.status !== 'active') continue;
      for (const o of st.objectives) {
        if (o.type === 'collect' && o.target === target && !o.done) {
          o.current = (o.current || 0) + 1;
          if (o.current >= (o.count || 1)) o.done = true;
          this.onObjectiveUpdated?.(q);
        }
      }
      this.checkComplete(q.id);
    }
  }

  progressReach() {
    for (const q of QUESTS) {
      const st = this.states.get(q.id);
      if (!st || st.status !== 'active') continue;
      for (const o of st.objectives) {
        if (o.type === 'reach' && !o.done) { o.current = 1; o.done = true; this.onObjectiveUpdated?.(q); }
      }
      this.checkComplete(q.id);
    }
  }

  progressSurvive(dt: number) {
    for (const q of QUESTS) {
      const st = this.states.get(q.id);
      if (!st || st.status !== 'active') continue;
      for (const o of st.objectives) {
        if (o.type === 'survive' && !o.done) {
          o.current = (o.current || 0) + dt;
          if (o.current >= (o.time || 1)) o.done = true;
          this.onObjectiveUpdated?.(q);
        }
      }
      this.checkComplete(q.id);
    }
  }

  private checkComplete(id: string) {
    const st = this.states.get(id);
    const def = this.def(id);
    if (!st || !def || st.status !== 'active') return;
    if (st.objectives.every((o) => o.done)) {
      st.status = 'completed';
      this.onQuestCompleted?.(def);
      this.checkAvailability();
    }
  }

  isObjectiveDone(qid: string, oid: string): boolean {
    const st = this.states.get(qid);
    return !!st?.objectives.find((o) => o.id === oid)?.done;
  }

  toSave(): QuestState[] {
    return Array.from(this.states.values());
  }

  fromSave(states: QuestState[]) {
    this.states.clear();
    for (const s of states) this.states.set(s.id, s);
  }
}
