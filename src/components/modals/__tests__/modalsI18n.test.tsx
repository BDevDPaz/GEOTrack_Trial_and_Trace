import React from "react";
import { render, screen } from "@testing-library/react-native";
import { LunchModal } from "../LunchModal";
import { DeleteSessionModal } from "../DeleteSessionModal";
import { ExitDetectionModal } from "../ExitDetectionModal";

describe("modales en el idioma de la app (Fase D 9)", () => {
  it("LunchModal en inglés", () => {
    render(<LunchModal visible language="en" onCancel={jest.fn()} onConfirm={jest.fn()} />);
    expect(screen.getByText("Break time")).toBeTruthy();
  });
  it("DeleteSessionModal ya no promete borrado permanente", () => {
    render(<DeleteSessionModal visible onCancel={jest.fn()} onConfirm={jest.fn()} />);
    expect(screen.queryByText(/permanentemente/)).toBeNull();
  });
  it("ExitDetectionModal interpola la hora", () => {
    render(<ExitDetectionModal visible language="en" exitTime="3:00 PM" onContinueOperating={jest.fn()} onCloseShift={jest.fn()} />);
    expect(screen.getByText(/3:00 PM/)).toBeTruthy();
  });
});
