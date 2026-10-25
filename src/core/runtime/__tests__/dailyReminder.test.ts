jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
  SchedulableTriggerInputTypes: { DAILY: "daily", DATE: "date" },
}));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("../../../utils/logger", () => ({ log: jest.fn() }));
jest.mock("../../../database/db", () => ({ getSettings: jest.fn() }));

import { notificationsAdapter, DAILY_REMINDER_ID } from "../notificationsAdapter";
import { scheduleDailyReminder } from "../../../services/Notifications";
import { LUNCH_REMINDER_ID } from "../../lunch/lunchReminder";

const mockN = require("expo-notifications");
beforeEach(() => jest.clearAllMocks());

describe.each([
  ["adapter", (t: string) => notificationsAdapter.scheduleDailyReminder(t)],
  ["service", (t: string) => scheduleDailyReminder(t)],
])("recordatorio diario (%s) no borra otras notificaciones", (_n, run) => {
  it("cancela solo su propio identificador y lo reutiliza", async () => {
    await run("07:15");
    expect(mockN.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    expect(mockN.cancelScheduledNotificationAsync).toHaveBeenCalledWith(DAILY_REMINDER_ID);
    expect(mockN.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith(LUNCH_REMINDER_ID);
    expect(mockN.scheduleNotificationAsync.mock.calls[0][0].identifier).toBe(DAILY_REMINDER_ID);
  });
});
