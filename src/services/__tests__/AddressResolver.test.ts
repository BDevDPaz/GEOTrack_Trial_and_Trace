import * as Location from "expo-location";
import {
  checkStart,
  evaluateDistance,
  resolveAddress,
} from "../AddressResolver";

jest.mock("../../utils/logger", () => ({ log: jest.fn() }));
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  geocodeAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const L = Location as jest.Mocked<typeof Location>;
const TARGET = { latitude: 34.1, longitude: -118.3 };

beforeEach(() => {
  jest.resetAllMocks();
  L.getForegroundPermissionsAsync.mockResolvedValue({
    status: "granted",
  } as any);
  L.reverseGeocodeAsync.mockResolvedValue([
    { formattedAddress: "123 Main St, Los Angeles, CA" } as any,
  ]);
});

describe("resolveAddress", () => {
  it("vacía -> empty, sin llamar al geocoder", async () => {
    expect(await resolveAddress("   ")).toEqual({ status: "empty" });
    expect(L.geocodeAsync).not.toHaveBeenCalled();
  });

  it("sin resultados -> not_found", async () => {
    L.geocodeAsync.mockResolvedValue([]);
    expect(await resolveAddress("zzz")).toEqual({ status: "not_found" });
  });

  it("encontrada -> coords + dirección formateada", async () => {
    L.geocodeAsync.mockResolvedValue([{ ...TARGET } as any]);
    expect(await resolveAddress("123 main")).toEqual({
      status: "ok",
      coords: TARGET,
      formattedAddress: "123 Main St, Los Angeles, CA",
    });
  });

  it("si reverse falla usa el texto ingresado", async () => {
    L.geocodeAsync.mockResolvedValue([{ ...TARGET } as any]);
    L.reverseGeocodeAsync.mockRejectedValue(new Error("x"));
    const r = await resolveAddress(" 123 main ");
    expect(r).toMatchObject({ status: "ok", formattedAddress: "123 main" });
  });

  it("error del geocoder -> error", async () => {
    L.geocodeAsync.mockRejectedValue(new Error("offline"));
    expect(await resolveAddress("x")).toEqual({ status: "error" });
  });
});

describe("evaluateDistance", () => {
  it("lejos (>2 km) -> isFar", () => {
    const r = evaluateDistance(
      TARGET,
      { latitude: 34.2, longitude: -118.3 },
      2000,
    );
    expect(r.isFar).toBe(true);
    expect(r.distanceMeters!).toBeGreaterThan(10000);
  });
  it("cerca -> no advierte", () => {
    const r = evaluateDistance(
      TARGET,
      { latitude: 34.1005, longitude: -118.3 },
      2000,
    );
    expect(r.isFar).toBe(false);
  });
  it("sin GPS -> no advierte", () => {
    expect(evaluateDistance(TARGET, null, 2000)).toEqual({
      distanceMeters: null,
      isFar: false,
    });
  });
  it("umbral inválido usa 2000 m por defecto", () => {
    const r = evaluateDistance(
      TARGET,
      { latitude: 34.115, longitude: -118.3 },
      0,
    );
    expect(r.isFar).toBe(false); // ~1.7 km
  });
});

describe("checkStart", () => {
  it("dirección no encontrada bloquea", async () => {
    L.geocodeAsync.mockResolvedValue([]);
    expect(await checkStart("mal", 2000)).toEqual({
      kind: "blocked",
      reason: "not_found",
    });
  });

  it("permiso denegado bloquea", async () => {
    L.geocodeAsync.mockResolvedValue([{ ...TARGET } as any]);
    L.getForegroundPermissionsAsync.mockResolvedValue({
      status: "denied",
    } as any);
    L.requestForegroundPermissionsAsync.mockResolvedValue({
      status: "denied",
    } as any);
    expect(await checkStart("ok", 2000)).toEqual({
      kind: "blocked",
      reason: "permission_denied",
    });
  });

  it("listo y lejos devuelve setup = posición actual", async () => {
    L.geocodeAsync.mockResolvedValue([{ ...TARGET } as any]);
    L.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 34.3, longitude: -118.3 },
    } as any);
    const r = await checkStart("ok", 2000);
    expect(r).toMatchObject({
      kind: "ready",
      target: TARGET,
      isFar: true,
      current: { latitude: 34.3, longitude: -118.3 },
    });
  });

  it("GPS falla: listo sin distancia", async () => {
    L.geocodeAsync.mockResolvedValue([{ ...TARGET } as any]);
    L.getCurrentPositionAsync.mockRejectedValue(new Error("timeout"));
    expect(await checkStart("ok", 2000)).toMatchObject({
      kind: "ready",
      current: null,
      isFar: false,
    });
  });
});
