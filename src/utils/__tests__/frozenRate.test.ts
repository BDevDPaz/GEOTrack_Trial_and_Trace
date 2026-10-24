import { resolveSessionRate } from "../payrollUtils";
import { createInitialState } from "../../core/state";
import { workTrackerReducer } from "../../core/reducer";
import { selectComputedSessions } from "../../core/selectors";

describe("A.8 tarifa congelada por jornada", () => {
  const fallback = { hourlyRate: 30, overtimeMultiplier: 2 };

  it("usa la tarifa guardada en la jornada", () => {
    expect(
      resolveSessionRate({ hourlyRate: 20, overtimeMultiplier: 1.5 }, fallback),
    ).toEqual({
      hourlyRate: 20,
      overtimeMultiplier: 1.5,
    });
  });

  it("jornada sin dato (antigua) usa ajustes", () => {
    expect(resolveSessionRate(undefined, fallback)).toEqual(fallback);
    expect(
      resolveSessionRate(
        { hourlyRate: null, overtimeMultiplier: NaN },
        fallback,
      ),
    ).toEqual(fallback);
  });

  it("el reducer congela la tarifa al crear y cambiar ajustes no altera la jornada", () => {
    let state = createInitialState();
    state.domain.settings.hourlyRate = 20;
    state.domain.settings.overtimeMultiplier = 1.5;
    state = workTrackerReducer(state, {
      type: "SESSION_CREATED",
      session: {
        id: 1,
        declaredStartAtMs: 0,
        domainStatus: "GEOFENCE_CREATED",
      },
    } as any);
    expect(state.domain.sessions.byId["1"].pay).toEqual({
      hourlyRate: 20,
      overtimeMultiplier: 1.5,
    });

    // la tarifa sube después
    state = {
      ...state,
      domain: {
        ...state.domain,
        settings: { ...state.domain.settings, hourlyRate: 99 },
      },
    };
    const s = state.domain.sessions.byId["1"];
    expect(resolveSessionRate(s.pay, state.domain.settings).hourlyRate).toBe(
      20,
    );

    // selector de nómina: 2 h a $20 congelados = $40 (no $198)
    state.domain.sessions.byId["1"] = { ...s, endAtMs: 2 * 3600000 };
    const [computed] = selectComputedSessions(state);
    expect(computed.computedPay).toBeCloseTo(40);
  });
});
