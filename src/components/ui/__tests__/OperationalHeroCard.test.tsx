import React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";
import { OperationalHeroCard } from "../OperationalHeroCard";

const base = { timeString: "0h", earnings: "$0", onPrimaryAction: jest.fn() };

describe("OperationalHeroCard — Fase C (8) cancelar trayecto", () => {
  it.each(["GEOFENCE_CREATED", "TRAVEL"])("muestra 'Cancelar trayecto' en %s si canCancel", (st) => {
    const onSec = jest.fn();
    render(<OperationalHeroCard {...base} state={st as any} canCancel onSecondaryAction={onSec} />);
    fireEvent.press(screen.getByText("Cancelar trayecto"));
    expect(onSec).toHaveBeenCalled();
  });
  it("no lo muestra tras la llegada (canCancel=false)", () => {
    render(<OperationalHeroCard {...base} state={"TRAVEL" as any} onSecondaryAction={jest.fn()} />);
    expect(screen.queryByText("Cancelar trayecto")).toBeNull();
  });
});
