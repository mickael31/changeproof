/**
 * Calcule la prochaine exécution d'un SyncSchedule.
 */

export type SyncFrequency = "never" | "hourly" | "daily" | "weekly" | "custom";

const NEVER_DATE = new Date("2999-12-31T23:59:59.999Z");

/**
 * Calcule la date de prochaine exécution à partir d'une fréquence
 * et optionnellement d'une expression cron (pour custom).
 */
export function computeNextRun(
  frequency: SyncFrequency,
  cronExpression?: string | null,
  from: Date = new Date()
): Date {
  switch (frequency) {
    case "never":
      return NEVER_DATE;

    case "hourly":
      return new Date(from.getTime() + 60 * 60 * 1000);

    case "daily":
      return new Date(from.getTime() + 24 * 60 * 60 * 1000);

    case "weekly":
      return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);

    case "custom": {
      if (!cronExpression) return NEVER_DATE;
      try {
        return parseSimpleCron(cronExpression, from);
      } catch {
        console.error(
          `[SyncCalculator] Expression cron invalide: "${cronExpression}", retour à "never"`
        );
        return NEVER_DATE;
      }
    }

    default:
      return NEVER_DATE;
  }
}

/**
 * Vérifie si un schedule est dû (nextRunAt dépassé ou absent).
 */
export function isDue(schedule: {
  frequency: string;
  isActive: boolean;
  nextRunAt: Date | null;
}): boolean {
  if (!schedule.isActive || schedule.frequency === "never") return false;

  if (!schedule.nextRunAt) return true;

  return new Date() >= new Date(schedule.nextRunAt);
}

/**
 * Parse une expression cron simplifiée du format :
 *   "0 *\/6 * * *" (toutes les 6 heures)
 *   "0 0 * * *"   (tous les jours à minuit)
 * On ne supporte que les patterns simples.
 */
function parseSimpleCron(expr: string, from: Date): Date {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) {
    throw new Error(`Expression cron invalide: "${expr}"`);
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const now = new Date(from);
  const result = new Date(now);

  // Réinitialiser secondes/ms
  result.setSeconds(0, 0);

  // Gérer l'heure
  if (hour.startsWith("*/")) {
    const interval = parseInt(hour.slice(2), 10);
    if (isNaN(interval) || interval <= 0) {
      throw new Error(`Intervalle d'heure invalide: "${hour}"`);
    }
    const currentHour = now.getHours();
    // Prochaine occurrence alignée sur l'intervalle
    const nextSlot = Math.ceil(currentHour / interval) * interval;
    if (nextSlot >= 24) {
      // Passer au jour suivant à minuit + reste
      result.setDate(result.getDate() + 1);
      result.setHours(0, parseInt(minute, 10) || 0, 0, 0);
    } else {
      result.setHours(nextSlot, parseInt(minute, 10) || 0, 0, 0);
    }
  } else if (hour === "*") {
    // Chaque heure
    result.setMinutes(parseInt(minute, 10) || 0, 0, 0);
    if (result <= now) {
      result.setHours(result.getHours() + 1);
    }
  } else {
    const h = parseInt(hour, 10);
    if (!isNaN(h)) {
      result.setHours(h, parseInt(minute, 10) || 0, 0, 0);
      if (result <= now) {
        result.setDate(result.getDate() + 1);
      }
    }
  }

  // Gérer dayOfMonth (simple)
  if (dayOfMonth !== "*" && dayOfMonth !== "?") {
    const d = parseInt(dayOfMonth, 10);
    if (!isNaN(d)) {
      result.setDate(d);
      if (result <= now) {
        result.setMonth(result.getMonth() + 1);
      }
    }
  }

  // Gérer month
  if (month !== "*") {
    const m = parseInt(month, 10);
    if (!isNaN(m)) {
      result.setMonth(m - 1);
      if (result <= now) {
        result.setFullYear(result.getFullYear() + 1);
      }
    }
  }

  // Gérer dayOfWeek (simple, 0=dimanche)
  if (dayOfWeek !== "*" && dayOfWeek !== "?") {
    const dow = parseInt(dayOfWeek, 10);
    if (!isNaN(dow)) {
      const currentDay = result.getDay();
      let daysToAdd = dow - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      result.setDate(result.getDate() + daysToAdd);
    }
  }

  return result;
}
