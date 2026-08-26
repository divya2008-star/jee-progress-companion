export type Subject = "Physics" | "Chemistry" | "Mathematics";
export type Stage = "not_started" | "revising" | "revised" | "test_ready";

export type Chapter = {
  id: string;
  title: string;
  subject: Subject;
  targetWeek: number;
  stage: Stage;
  starred?: boolean;
  flagged?: boolean;
  notes?: string;
};

export type Flashcard = {
  id: string;
  subject: Subject;
  chapterId: string;
  chapter: string;
  front: string;
  back: string;
};

const physics = [
  "Units & Dimensions", "Kinematics", "Laws of Motion", "Work, Energy & Power", "Centre of Mass", "Rotational Motion", "Gravitation", "Properties of Matter", "Thermodynamics", "Kinetic Theory", "Oscillations", "Waves", "Electrostatics", "Current Electricity", "Magnetism", "Electromagnetic Induction", "Optics", "Modern Physics",
];
const chemistry = [
  "Mole Concept", "Atomic Structure", "Periodic Table", "Chemical Bonding", "States of Matter", "Thermodynamics", "Equilibrium", "Redox Reactions", "Electrochemistry", "Chemical Kinetics", "Solutions", "Coordination Compounds", "GOC", "Hydrocarbons", "Haloalkanes", "Alcohols & Ethers", "Amines", "Biomolecules",
];
const mathematics = [
  "Sets & Relations", "Quadratic Equations", "Sequence & Series", "Binomial Theorem", "Permutation & Combination", "Complex Numbers", "Matrices", "Determinants", "Limits", "Continuity & Differentiability", "Application of Derivatives", "Indefinite Integration", "Definite Integration", "Differential Equations", "Straight Lines", "Circles", "Probability", "Vectors & 3D Geometry",
];

function prepare(subject: Subject, names: string[], offset: number): Chapter[] {
  return names.map((title, index) => ({
    id: `${subject.slice(0, 3).toLowerCase()}-${index + 1}`,
    title,
    subject,
    targetWeek: ((index + offset) % 12) + 1,
    stage: index < 2 ? "test_ready" : index < 5 ? "revised" : index < 9 ? "revising" : "not_started",
    starred: index === 1 || index === 8,
    flagged: index === 5,
    notes: index === 5 ? "Revisit common calculation slips before the next timed set." : "",
  }));
}

export const initialChapters: Chapter[] = [
  ...prepare("Physics", physics, 0),
  ...prepare("Chemistry", chemistry, 3),
  ...prepare("Mathematics", mathematics, 6),
];

const card = (id: string, subject: Subject, chapterId: string, chapter: string, front: string, back: string): Flashcard => ({ id, subject, chapterId, chapter, front, back });

export const flashcards: Flashcard[] = [
  card("p-kin-1", "Physics", "phy-2", "Kinematics", "SUVAT: displacement", "s = ut + ½at²"),
  card("p-kin-2", "Physics", "phy-2", "Kinematics", "SUVAT: velocity", "v = u + at and v² = u² + 2as"),
  card("p-kin-3", "Physics", "phy-2", "Kinematics", "Projectile range on level ground", "R = u²sin(2θ)/g; maximum at θ = 45°."),
  card("p-new-1", "Physics", "phy-3", "Laws of Motion", "Newton's second law", "ΣF = dp/dt. For constant mass, ΣF = ma."),
  card("p-new-2", "Physics", "phy-3", "Laws of Motion", "Limiting friction", "fₗ = μₛN. Kinetic friction is fₖ = μₖN."),
  card("p-new-3", "Physics", "phy-3", "Laws of Motion", "Pseudo force in a non-inertial frame", "Fₚ = −m a(frame), opposite to the frame's acceleration."),
  card("p-wep-1", "Physics", "phy-4", "Work, Energy & Power", "Work by a constant force", "W = F·s = Fs cosθ."),
  card("p-wep-2", "Physics", "phy-4", "Work, Energy & Power", "Work–energy theorem", "W(net) = ΔK = ½m(v² − u²)."),
  card("p-wep-3", "Physics", "phy-4", "Work, Energy & Power", "Power", "P = dW/dt = F·v."),
  card("p-rot-1", "Physics", "phy-6", "Rotational Motion", "Rotational kinetic energy", "K(rot) = ½Iω²."),
  card("p-rot-2", "Physics", "phy-6", "Rotational Motion", "Torque equation", "τ = Iα about a fixed axis."),
  card("p-rot-3", "Physics", "phy-6", "Rotational Motion", "Angular momentum", "L = Iω and τ = dL/dt."),
  card("p-thermo-1", "Physics", "phy-9", "Thermodynamics", "First law of thermodynamics", "ΔQ = ΔU + ΔW, where work is done by the gas."),
  card("p-thermo-2", "Physics", "phy-9", "Thermodynamics", "Ideal-gas internal energy", "ΔU = nCᵥΔT."),
  card("p-thermo-3", "Physics", "phy-9", "Thermodynamics", "Adiabatic relation", "PVᵞ = constant for a reversible adiabatic process."),
  card("p-elec-1", "Physics", "phy-13", "Electrostatics", "Coulomb's law", "F = (1/4πε₀)·q₁q₂/r²."),
  card("p-elec-2", "Physics", "phy-13", "Electrostatics", "Electric field of a point charge", "E = (1/4πε₀)·q/r²."),
  card("p-elec-3", "Physics", "phy-13", "Electrostatics", "Potential of a point charge", "V = (1/4πε₀)·q/r."),
  card("p-current-1", "Physics", "phy-14", "Current Electricity", "Ohm's law", "V = IR."),
  card("p-current-2", "Physics", "phy-14", "Current Electricity", "Resistance of a wire", "R = ρl/A."),
  card("p-current-3", "Physics", "phy-14", "Current Electricity", "Electrical power", "P = VI = I²R = V²/R."),
  card("c-mole-1", "Chemistry", "che-1", "Mole Concept", "Moles and particles", "n = mass/molar mass = N/Nₐ."),
  card("c-mole-2", "Chemistry", "che-1", "Mole Concept", "Molarity", "M = moles of solute / volume of solution in litres."),
  card("c-mole-3", "Chemistry", "che-1", "Mole Concept", "Molality", "m = moles of solute / mass of solvent in kg."),
  card("c-atom-1", "Chemistry", "che-2", "Atomic Structure", "de Broglie wavelength", "λ = h/p = h/mv."),
  card("c-atom-2", "Chemistry", "che-2", "Atomic Structure", "Energy of hydrogen-like atom", "Eₙ = −13.6 Z²/n² eV."),
  card("c-atom-3", "Chemistry", "che-2", "Atomic Structure", "Bohr radius", "rₙ = 0.529 n²/Z Å."),
  card("c-thermo-1", "Chemistry", "che-6", "Thermodynamics", "Gibbs energy", "ΔG = ΔH − TΔS."),
  card("c-thermo-2", "Chemistry", "che-6", "Thermodynamics", "Relation to equilibrium", "ΔG° = −RT ln K."),
  card("c-thermo-3", "Chemistry", "che-6", "Thermodynamics", "Enthalpy at constant pressure", "qₚ = ΔH."),
  card("c-eq-1", "Chemistry", "che-7", "Equilibrium", "Reaction quotient", "At equilibrium, Q = K; compare Q with K to predict shift."),
  card("c-eq-2", "Chemistry", "che-7", "Equilibrium", "Ionic product of water", "Kʷ = [H⁺][OH⁻] = 10⁻¹⁴ at 25°C."),
  card("c-eq-3", "Chemistry", "che-7", "Equilibrium", "Henderson–Hasselbalch equation", "pH = pKₐ + log([A⁻]/[HA])."),
  card("c-electro-1", "Chemistry", "che-9", "Electrochemistry", "Nernst equation at 298 K", "E = E° − (0.0591/n)log Q."),
  card("c-electro-2", "Chemistry", "che-9", "Electrochemistry", "Cell potential and free energy", "ΔG = −nFEcell."),
  card("c-electro-3", "Chemistry", "che-9", "Electrochemistry", "Faraday's law", "m = (ItM)/(nF)."),
  card("c-kin-1", "Chemistry", "che-10", "Chemical Kinetics", "First-order integrated rate law", "k = (2.303/t) log(a/(a−x))."),
  card("c-kin-2", "Chemistry", "che-10", "Chemical Kinetics", "First-order half-life", "t½ = 0.693/k."),
  card("c-kin-3", "Chemistry", "che-10", "Chemical Kinetics", "Arrhenius equation", "k = Ae^(−Eₐ/RT)."),
  card("m-quad-1", "Mathematics", "mat-2", "Quadratic Equations", "Roots of ax² + bx + c = 0", "x = [−b ± √(b²−4ac)]/(2a)."),
  card("m-quad-2", "Mathematics", "mat-2", "Quadratic Equations", "Sum and product of roots", "α + β = −b/a; αβ = c/a."),
  card("m-quad-3", "Mathematics", "mat-2", "Quadratic Equations", "Discriminant", "D = b² − 4ac; D > 0 gives distinct real roots."),
  card("m-series-1", "Mathematics", "mat-3", "Sequence & Series", "Arithmetic progression sum", "Sₙ = n/2[2a + (n−1)d]."),
  card("m-series-2", "Mathematics", "mat-3", "Sequence & Series", "Geometric progression sum", "Sₙ = a(rⁿ−1)/(r−1), r ≠ 1."),
  card("m-series-3", "Mathematics", "mat-3", "Sequence & Series", "Infinite GP sum", "S∞ = a/(1−r), valid when |r| < 1."),
  card("m-limit-1", "Mathematics", "mat-9", "Limits", "Standard trigonometric limit", "lim(x→0) sin x/x = 1 (x in radians)."),
  card("m-limit-2", "Mathematics", "mat-9", "Limits", "Exponential limit", "lim(x→0) (1+x)^(1/x) = e."),
  card("m-limit-3", "Mathematics", "mat-9", "Limits", "Logarithmic limit", "lim(x→0) ln(1+x)/x = 1."),
  card("m-diff-1", "Mathematics", "mat-10", "Continuity & Differentiability", "Derivative of xⁿ", "d(xⁿ)/dx = nxⁿ⁻¹."),
  card("m-diff-2", "Mathematics", "mat-10", "Continuity & Differentiability", "Derivative of ln x", "d(ln x)/dx = 1/x."),
  card("m-diff-3", "Mathematics", "mat-10", "Continuity & Differentiability", "Chain rule", "d[f(g(x))]/dx = f′(g(x))·g′(x)."),
  card("m-int-1", "Mathematics", "mat-12", "Indefinite Integration", "Power rule", "∫xⁿ dx = xⁿ⁺¹/(n+1) + C, n ≠ −1."),
  card("m-int-2", "Mathematics", "mat-12", "Indefinite Integration", "Integral of 1/x", "∫dx/x = ln|x| + C."),
  card("m-int-3", "Mathematics", "mat-12", "Indefinite Integration", "Integration by parts", "∫u dv = uv − ∫v du."),
  card("m-prob-1", "Mathematics", "mat-17", "Probability", "Conditional probability", "P(A|B) = P(A∩B)/P(B)."),
  card("m-prob-2", "Mathematics", "mat-17", "Probability", "Bayes' theorem", "P(Aᵢ|B) = P(Aᵢ)P(B|Aᵢ) / ΣP(Aⱼ)P(B|Aⱼ)."),
  card("m-prob-3", "Mathematics", "mat-17", "Probability", "Independent events", "P(A∩B) = P(A)P(B)."),
];

export const stageMeta: Record<Stage, { label: string; value: number; color: string }> = {
  not_started: { label: "Not started", value: 0, color: "#D9CDC2" },
  revising: { label: "Revising", value: 1, color: "#D9A75B" },
  revised: { label: "Revised", value: 2, color: "#9A6647" },
  test_ready: { label: "Test-ready", value: 3, color: "#4F2A1C" },
};
