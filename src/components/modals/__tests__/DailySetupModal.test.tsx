import React from "react";
import { Alert } from "react-native";
import {
  render,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react-native";

jest.mock("expo-location", () => ({
  geocodeAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
jest.mock("../../../utils/logger", () => ({ log: jest.fn() }));

import * as Location from "expo-location";
import { DailySetupModal } from "../DailySetupModal";

const L = Location as jest.Mocked<typeof Location>;
// Destino: centro de LA. Usuario: cerca (≈100 m) o lejos (≈5 km).
const TARGET = { latitude: 34.0522, longitude: -118.2437 };
const NEAR = { latitude: 34.0531, longitude: -118.2437 };
const FAR = { latitude: 34.0972, longitude: -118.2437 };

const setGps = (c: { latitude: number; longitude: number }) => {
  L.getForegroundPermissionsAsync.mockResolvedValue({
    status: "granted",
  } as any);
  L.getCurrentPositionAsync.mockResolvedValue({ coords: c } as any);
};

const fill = () => {
  fireEvent.changeText(
    screen.getByPlaceholderText("Ej. Taller central"),
    "Obra 1",
  );
  fireEvent.changeText(
    screen.getByPlaceholderText("Ej. 123 Main St, Los Angeles, CA"),
    "200 N Spring St",
  );
  const btns = screen.getAllByText("Iniciar jornada");
  fireEvent.press(btns[btns.length - 1]);
};

// Alert.alert: responde con el botón indicado (último = confirmar)
const alerts: { title: string; message?: string }[] = [];
beforeEach(() => {
  jest.clearAllMocks();
  alerts.length = 0;
  jest.spyOn(Alert, "alert").mockImplementation((title, message, buttons) => {
    alerts.push({ title, message });
    buttons?.[buttons.length - 1]?.onPress?.();
  });
});

describe("DailySetupModal", () => {
  it("dirección no encontrada: muestra error y no inicia", async () => {
    L.geocodeAsync.mockResolvedValue([]);
    setGps(NEAR);
    const onConfirm = jest.fn();
    render(
      <DailySetupModal visible onCancel={jest.fn()} onConfirm={onConfirm} />,
    );
    fill();
    expect(
      await screen.findByText("Dirección no encontrada, revísala"),
    ).toBeTruthy();
    expect(alerts).toHaveLength(0);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("dirección encontrada: pide confirmarla y luego inicia (cerca, sin aviso)", async () => {
    L.geocodeAsync.mockResolvedValue([TARGET] as any);
    L.reverseGeocodeAsync.mockResolvedValue([
      { formattedAddress: "200 N Spring St, Los Angeles, CA 90012" },
    ] as any);
    setGps(NEAR);
    const onConfirm = jest.fn();
    render(
      <DailySetupModal visible onCancel={jest.fn()} onConfirm={onConfirm} />,
    );
    fill();
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(alerts.map((a) => a.title)).toEqual(["Confirma la dirección"]);
    expect(alerts[0].message).toContain(
      "200 N Spring St, Los Angeles, CA 90012",
    );
    expect(onConfirm.mock.calls[0][1].target).toEqual(TARGET);
  });

  it("a más de 2000 m: muestra '¿Estás seguro?'", async () => {
    L.geocodeAsync.mockResolvedValue([TARGET] as any);
    L.reverseGeocodeAsync.mockResolvedValue([{ formattedAddress: "X" }] as any);
    setGps(FAR);
    const onConfirm = jest.fn();
    render(
      <DailySetupModal visible onCancel={jest.fn()} onConfirm={onConfirm} />,
    );
    fill();
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(alerts.map((a) => a.title)).toEqual([
      "Confirma la dirección",
      "¿Estás seguro?",
    ]);
    expect(alerts[1].message).toMatch(/5\.0 km/);
  });
});
