import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios'
import {
  announcementRepository,
  configRepository,
  leaderboardRepository,
  reactionRepository,
  sessionRepository,
  stateRepository,
  substanceRepository,
  userRepository,
} from './clientRepositories'
import { CLIENT_RUNTIME_STORAGE_KEYS, clientRuntimeStorage, getClientRuntimeHost, removeClientRuntimeKeys } from './clientRuntimeStorage'
import { ensureClientRuntimeDatabase, runtimeSqlite } from './clientRuntimeDatabase'
import type {
  Card,
  ChatMessage,
  Deck,
  DispatchResult,
  FeedbackItem,
  GameState,
  PlayerState,
  PlayedCard,
  Room,
  RoomMessage,
  RuntimeSessionMetadata,
  State,
  User,
} from './clientRuntimeTypes'
import { TUTORIAL_INITIAL_STATE, getTutorialStep, type TutorialStep } from './tutorialScript'

const STORAGE_KEY = CLIENT_RUNTIME_STORAGE_KEYS.state
const TURN_TIMEOUT_MS = 25000
const AI_TURN_DELAY_MIN_MS = 60
const AI_TURN_DELAY_MAX_MS = 140
const eventBus = new EventTarget()
const turnTimers = new Map<string, number>()
const aiTimers = new Map<string, number>()
const aiNames = ['Mendeleev', 'Curie', 'Bohr', 'Faraday', 'Lavoisier']
const specialCards = new Set(['+2', '+4', 'Au', 'He', 'Ne', 'Ar', 'Kr'])

const builtinDeck: Record<string, number> = {
  H: 12, O: 12, C: 4, N: 4, F: 4, Na: 4, Mg: 4, Al: 4, Si: 4, P: 4, S: 4,
  Cl: 4, K: 4, Ca: 4, Mn: 4, Fe: 4, Cu: 4, Zn: 4, Br: 4, I: 4, Ag: 4,
  '+2': 8, '+4': 4, Au: 4, He: 1, Ne: 1, Ar: 1, Kr: 1
}

const substanceNames: Record<string, string> = {
  H: 'Hydrogen', O: 'Oxygen', C: 'Carbon', N: 'Nitrogen', Na: 'Sodium', Mg: 'Magnesium', Al: 'Aluminum', Si: 'Silicon', P: 'Phosphorus', S: 'Sulfur', Cl: 'Chlorine', K: 'Potassium', Ca: 'Calcium', Fe: 'Iron', Cu: 'Copper', Zn: 'Zinc', Ag: 'Silver', Br: 'Bromine', I: 'Iodine',
  H2: 'Hydrogen Gas', O2: 'Oxygen Gas', N2: 'Nitrogen Gas', Cl2: 'Chlorine Gas', Br2: 'Bromine', I2: 'Iodine',
  H2O: 'Water', CO2: 'Carbon Dioxide', HCl: 'Hydrochloric Acid', H2SO4: 'Sulfuric Acid', HNO3: 'Nitric Acid', NaOH: 'Sodium Hydroxide', KOH: 'Potassium Hydroxide', 'Ca(OH)2': 'Calcium Hydroxide', NH3: 'Ammonia', NaCl: 'Sodium Chloride', CuSO4: 'Copper Sulfate', Fe2O3: 'Iron Oxide', CuO: 'Copper Oxide', MgO: 'Magnesium Oxide', CaO: 'Calcium Oxide', SO2: 'Sulfur Dioxide', SO3: 'Sulfur Trioxide', Na2CO3: 'Sodium Carbonate', NaHCO3: 'Sodium Bicarbonate', CaCO3: 'Calcium Carbonate', BaCl2: 'Barium Chloride', BaSO4: 'Barium Sulfate', AgNO3: 'Silver Nitrate', AgCl: 'Silver Chloride',
  '+2': '+2', '+4': '+4', Au: 'Gold', He: 'Helium', Ne: 'Neon', Ar: 'Argon', Kr: 'Krypton'
}

const reactionPairs: Record<string, string> = {
  '(C6H10O5)n|H2O': '(C6H10O5)n + nH2O = nC6H12O6',
  '(NH4)2CO3|CaCl2': '(NH4)2CO3 + CaCl2 = CaCO3 + 2NH4Cl',
  '(NH4)2CO3|HCl': '(NH4)2CO3 + 2HCl = 2NH4Cl + CO2 + H2O',
  '(NH4)2Cr2O7|KCl': '(NH4)2Cr2O7 + 2KCl = K2Cr2O7 + 2NH4Cl',
  '(NH4)2HPO4|FeCl3': 'FeCl3 + 2(NH4)2HPO4 = FePO4 + NH4H2PO4 + 3NH4Cl',
  '(NH4)2SO4|Ba(NO3)2': '(NH4)2SO4 + Ba(NO3)2 = BaSO4 + 2NH4NO3',
  '(NH4)2SO4|Ba(OH)2': '(NH4)2SO4 + Ba(OH)2 = BaSO4 + 2NH3 + 2H2O',
  '(NH4)2SO4|BaCl2': '(NH4)2SO4 + BaCl2 = BaSO4 + 2NH4Cl',
  '(NH4)2SO4|Ca(OH)2': '(NH4)2SO4 + Ca(OH)2 = CaSO4 + 2NH3 + 2H2O',
  '(NH4)2SO4|KOH': '2KOH + (NH4)2SO4 = K2SO4 + 2NH3 + 2H2O',
  '(NH4)2S|CdSO4': '(NH4)2S + CdSO4 = CdS + (NH4)2SO4',
  '(NH4)2S|CuSO4': '(NH4)2S + CuSO4 = CuS + (NH4)2SO4',
  '(NH4)2S|H2SO4': '(NH4)2S + H2SO4 = (NH4)2SO4 + H2S',
  '(NH4)2S|MnSO4': 'MnSO4 + (NH4)2S = MnS + (NH4)2SO4',
  'Ag(NH3)2OH|C12H22O11': 'C12H22O11 + 2Ag(NH3)2OH = C12H22O12 + 2Ag + 4NH3 + H2O',
  'Ag(NH3)2OH|C6H12O6': 'C6H12O6 + 2Ag(NH3)2OH = C6H12O7 + 2Ag + 4NH3 + H2O',
  'Ag(NH3)2OH|CH3CHO': 'CH3CHO + 2Ag(NH3)2OH = CH3COONH4 + 2Ag + 3NH3 + H2O',
  'Ag(NH3)2OH|HCHO': 'HCHO + 4Ag(NH3)2OH = (NH4)2CO3 + 4Ag + 6NH3 + 2H2O',
  'Ag2O|NH3·H2O': '4NH3·H2O + Ag2O = 2[Ag(NH3)2]OH + 3H2O',
  'AgBrO3|HCl': 'AgBrO3 + HCl = AgCl + HBrO3',
  'AgBr|NH3': '2NH3 + AgBr = [Ag(NH3)2]Br',
  'AgClO3|NaCl': 'AgClO3 + NaCl = AgCl + NaClO3',
  'AgClO4|Na3PO4': 'Na3PO4 + 3AgClO4 = Ag3PO4 + 3NaClO4',
  'AgI|NH3': '2NH3 + AgI = [Ag(NH3)2]I',
  'AgNO3|BaCl2': '2AgNO₃ + BaCl₂ = 2AgCl↓ + Ba(NO₃)₂',
  'AgNO3|Cu': '2AgNO₃ + Cu = Cu(NO₃)₂ + 2Ag',
  'AgNO3|Fe': 'Fe + 2AgNO₃ = Fe(NO₃)₂ + 2Ag',
  'AgNO3|H2S': 'H₂S + 2AgNO₃ = Ag₂S↓ + 2HNO₃',
  'AgNO3|HBr': 'HBr + AgNO3 = AgBr + HNO3',
  'AgNO3|HCl': 'HCl + AgNO₃ = AgCl↓ + HNO₃',
  'AgNO3|HI': 'HI + AgNO3 = AgI + HNO3',
  'AgNO3|KBr': 'AgNO3 + KBr = AgBr + KNO3',
  'AgNO3|KBrO3': 'KBrO3 + AgNO3 = AgBrO3 + KNO3',
  'AgNO3|KClO3': 'KClO3 + AgNO3 = AgClO3 + KNO3',
  'AgNO3|KI': 'AgNO₃ + KI = AgI↓ + KNO₃',
  'AgNO3|NH3·H2O': '2NH3·H2O + AgNO3 = [Ag(NH3)2]NO3 + 2H2O',
  'AgNO3|NH4Cl': 'NH4Cl + AgNO3 = AgCl + NH4NO3',
  'AgNO3|Na2CrO4': 'Na2CrO4 + 2AgNO3 = Ag2CrO4 + 2NaNO3',
  'AgNO3|Na3PO4': '3AgNO3 + Na3PO4 = Ag3PO4 + 3NaNO3',
  'AgNO3|NaBr': 'AgNO₃ + NaBr = AgBr↓ + NaNO₃',
  'AgNO3|NaCl': 'NaCl + AgNO₃ = AgCl↓ + NaNO₃',
  'AgNO3|NaI': 'AgNO₃ + NaI = AgI↓ + NaNO₃',
  'AgNO3|Zn': 'Zn + 2AgNO₃ = Zn(NO₃)₂ + 2Ag',
  'AgOH|CH3I': 'CH3I + AgOH = CH3OH + AgI',
  'AgOH|NH3·H2O': 'AgOH + 2NH3·H2O = [Ag(NH3)2]OH + 2H2O',
  'Ag|Br2': '2Ag + Br₂ = 2AgBr',
  'Ag|Cl2': '2Ag + Cl₂ = 2AgCl',
  'Ag|F2': 'F₂ + 2Ag = 2AgF',
  'Ag|HNO3': 'Ag + 2HNO₃(浓) = AgNO₃ + NO₂↑ + H₂O',
  'Ag|I2': '2Ag + I₂ = 2AgI',
  'Ag|O2': '4Ag + O₂ = 2Ag₂O',
  'Al(OH)3|HCl': 'Al(OH)3 + 3HCl = AlCl3 + 3H2O',
  'Al(OH)3|NaOH': 'Al(OH)3 + NaOH = Na[Al(OH)4]',
  'Al2(SO4)3|KOH': 'Al₂(SO₄)₃ + 6KOH = 2Al(OH)₃↓ + 3K₂SO₄',
  'Al2(SO4)3|Mg': '3Mg + Al₂(SO₄)₃ = 3MgSO₄ + 2Al',
  'Al2(SO4)3|NaHCO3': 'Al2(SO4)3 + 6NaHCO3 = 2Al(OH)3 + 3Na2SO4 + 6CO2',
  'Al2O3|HF': '6HF + Al₂O₃ = 2AlF₃ + 3H₂O',
  'Al2O3|NaOH': 'Al₂O₃ + 2NaOH = 2NaAlO₂ + H₂O',
  'AlCl3|KOH': '3KOH + AlCl3 = Al(OH)3 + 3KCl',
  'AlCl3|Mg': '3Mg + 2AlCl₃ = 3MgCl₂ + 2Al',
  'AlCl3|NH3·H2O': 'AlCl3 + 3NH3·H2O = Al(OH)3 + 3NH4Cl',
  'AlCl3|Na2S': '2AlCl3 + 3Na2S + 6H2O = 2Al(OH)3 + 3H2S + 6NaCl',
  'AlCl3|NaOH': 'AlCl₃ + 3NaOH = Al(OH)₃↓ + 3NaCl',
  'Al|Br2': '2Al + 3Br₂ = 2AlBr₃',
  'Al|Cl2': '2Al + 3Cl₂ = 2AlCl₃',
  'Al|CuCl2': '2Al + 3CuCl₂ = 2AlCl₃ + 3Cu',
  'Al|CuO': '2Al + 3CuO = Al₂O₃ + 3Cu',
  'Al|CuSO4': '2Al + 3CuSO4 = Al2(SO4)3 + 3Cu',
  'Al|F2': '3F₂ + 2Al = 2AlF₃',
  'Al|Fe2O3': '2Al + Fe₂O₃ = Al₂O₃ + 2Fe',
  'Al|Fe3O4': '8Al + 3Fe₃O₄ = 4Al₂O₃ + 9Fe',
  'Al|FeCl2': '2Al + 3FeCl₂ = 2AlCl₃ + 3Fe',
  'Al|H2S': '2Al + 3H₂S = Al₂S₃ + 3H₂↑',
  'Al|H2SO3': '2Al + 3H₂SO₃ = Al₂(SO₃)₃ + 3H₂↑',
  'Al|H2SO4': '2Al + 3H₂SO₄ = Al₂(SO₄)₃ + 3H₂↑',
  'Al|H3PO4': '2Al + 2H₃PO₄ = 2AlPO₄↓ + 3H₂↑',
  'Al|HBr': '2Al + 6HBr = 2AlBr₃ + 3H₂↑',
  'Al|HCl': '2Al + 6HCl = 2AlCl₃ + 3H₂↑',
  'Al|HF': '2Al + 6HF = 2AlF₃ + 3H₂↑',
  'Al|HI': '2Al + 6HI = 2AlI₃ + 3H₂↑',
  'Al|HNO3': '8Al + 30HNO₃(稀) = 8Al(NO₃)₃ + 3NH₄NO₃ + 9H₂O',
  'Al|I2': '2Al + 3I₂ = 2AlI₃',
  'Al|KClO4': '3KClO4 + 8Al = 3KCl + 4Al2O3',
  'Al|MnO': '3MnO + 2Al = 3Mn + Al2O3',
  'Al|MnO2': '3MnO2 + 4Al = 3Mn + 2Al2O3',
  'Al|NH4ClO4': '3NH4ClO4 + 3Al = Al2O3 + AlCl3 + 3NO + 6H2O',
  'Al|NaOH': '2Al + 2NaOH + 2H₂O = 2NaAlO₂ + 3H₂↑',
  'Al|O2': '4Al + 3O₂ = 2Al₂O₃',
  'Al|S': '2Al + 3S = Al₂S₃',
  'Al|ZnCl2': '2Al + 3ZnCl₂ = 2AlCl₃ + 3Zn',
  'Ba(ClO3)2|H2SO4': 'Ba(ClO3)2 + H2SO4 = BaSO4 + 2HClO3',
  'Ba(ClO3)2|Na2SO4': 'Ba(ClO3)2 + Na2SO4 = BaSO4 + 2NaClO3',
  'Ba(NO3)2|Na2SO4': 'Ba(NO3)2 + Na2SO4 = BaSO4 + 2NaNO3',
  'Ba(OH)2|CuCl2': 'Ba(OH)2 + CuCl2 = Cu(OH)2 + BaCl2',
  'Ba(OH)2|H2SO4': 'Ba(OH)2 + H2SO4 = BaSO4 + 2H2O',
  'Ba(OH)2|HF': '2HF + Ba(OH)₂ = BaF₂ + 2H₂O',
  'Ba(OH)2|MgSO4': 'MgSO₄ + Ba(OH)₂ = BaSO₄↓ + Mg(OH)₂↓',
  'Ba(OH)2|NH4Cl': '2NH4Cl + Ba(OH)2 = BaCl2 + 2NH3 + 2H2O',
  'Ba(OH)2|Na2SO4': 'Ba(OH)₂ + Na₂SO₄ = BaSO₄↓ + 2NaOH',
  'BaCl2|H2SO4': 'H₂SO₄ + BaCl₂ = BaSO₄↓ + 2HCl',
  'BaCl2|K2CO3': 'K2CO3 + BaCl2 = BaCO3 + 2KCl',
  'BaCl2|K2Cr2O7': 'K2Cr2O7 + BaCl2 = BaCr2O7 + 2KCl',
  'BaCl2|K2CrO4': 'K2CrO4 + BaCl2 = BaCrO4 + 2KCl',
  'BaCl2|Na2CO3': 'Na2CO3 + BaCl2 = BaCO3 + 2NaCl',
  'BaCl2|Na2SO3': 'Na2SO3 + BaCl2 = BaSO3 + 2NaCl',
  'BaCl2|Na2SO4': 'BaCl₂ + Na₂SO₄ = BaSO₄↓ + 2NaCl',
  'BaCl2|Na2SiO3': 'Na2SiO3 + BaCl2 = BaSiO3 + 2NaCl',
  'BaCl2|Na3PO4': '2Na₃PO₄ + 3BaCl₂ = Ba₃(PO₄)₂↓ + 6NaCl',
  'BaCl2|NaF': '2NaF + BaCl₂ = BaF₂↓ + 2NaCl',
  'BaCl2|ZnSO4': 'ZnSO₄ + BaCl₂ = BaSO₄↓ + ZnCl₂',
  'BaH2|H2O': 'BaH₂ + 2H₂O = Ba(OH)₂ + 2H₂↑',
  'BaO|CO2': 'BaO + CO₂ = BaCO₃',
  'BaO|H2O': 'BaO + H₂O = Ba(OH)₂',
  'BaO|SO2': 'BaO + SO₂ = BaSO₃',
  'BaO|SO3': 'BaO + SO₃ = BaSO₄',
  'Ba|Br2': 'Ba + Br₂ = BaBr₂',
  'Ba|Cl2': 'Ba + Cl₂ = BaCl₂',
  'Ba|F2': 'F₂ + Ba = BaF₂',
  'Ba|H2': 'Ba + H₂ = BaH₂',
  'Ba|H2S': 'Ba + H₂S = BaS + H₂↑',
  'Ba|H2SO3': 'Ba + H₂SO₃ = BaSO₃ + H₂↑',
  'Ba|H2SO4': 'Ba + H₂SO₄ = BaSO₄ + H₂↑',
  'Ba|HBr': 'Ba + 2HBr = BaBr₂ + H₂↑',
  'Ba|HCl': 'Ba + 2HCl = BaCl₂ + H₂↑',
  'Ba|HF': 'Ba + 2HF = BaF₂ + H₂↑',
  'Ba|HI': 'Ba + 2HI = BaI₂ + H₂↑',
  'Ba|HNO3': '4Ba + 10HNO₃ = 4Ba(NO₃)₂ + NH₄NO₃ + 3H₂O',
  'Ba|I2': 'Ba + I₂ = BaI₂',
  'Ba|O2': '2Ba + O₂ = 2BaO',
  'Ba|S': 'Ba + S = BaS',
  'Br2|C2H2': 'C2H2 + 2Br2 = C2H2Br4',
  'Br2|C3H8': 'C3H8 + Br2 = C3H7Br + HBr',
  'Br2|C6H5OH': 'C6H5OH + 3Br2 = C6H2Br3OH + 3HBr',
  'Br2|C6H6': 'C6H6 + Br2 = C6H5Br + HBr',
  'Br2|Ca': 'Ca + Br₂ = CaBr₂',
  'Br2|Cu': 'Cu + Br₂ = CuBr₂',
  'Br2|Fe': '2Fe + 3Br₂ = 2FeBr₃',
  'Br2|FeI2': '2FeI2 + 3Br2 = 2FeBr3 + 2I2',
  'Br2|FeSO4': '3Br₂ + 6FeSO₄ = 2Fe₂(SO₄)₃ + 2FeBr₃',
  'Br2|H2': 'Br₂ + H₂ = 2HBr',
  'Br2|H2O': 'Br₂ + H₂O = HBr + HBrO',
  'Br2|H2O2': 'Br2 + H2O2 = 2HBr + O2',
  'Br2|H2S': 'Br₂ + H₂S = S↓ + 2HBr',
  'Br2|HI': 'Br2 + 2HI = 2HBr + I2',
  'Br2|Hg': 'Hg + Br₂ = HgBr₂',
  'Br2|K': '2K + Br₂ = 2KBr',
  'Br2|KI': 'Br₂ + 2KI = 2KBr + I₂',
  'Br2|Mg': 'Mg + Br₂ = MgBr₂',
  'Br2|Mn': 'Mn + Br2 = MnBr2',
  'Br2|NH3': '8NH3 + 3Br2 = 6NH4Br + N2',
  'Br2|Na': '2Na + Br₂ = 2NaBr',
  'Br2|Na2S': 'Br2 + Na2S = 2NaBr + S',
  'Br2|Na2SO3': 'Br₂ + Na₂SO₃ + H₂O = Na₂SO₄ + 2HBr',
  'Br2|NaI': 'Br₂ + 2NaI = 2NaBr + I₂',
  'Br2|NaOH': 'Br2 + 2NaOH = NaBr + NaBrO + H2O',
  'Br2|SO2': 'Br2 + SO2 + 2H2O = H2SO4 + 2HBr',
  'Br2|Zn': 'Zn + Br₂ = ZnBr₂',
  'C2H2|HCl': 'C2H2 + HCl = CH2=CHCl',
  'C2H4O|NH3': 'NH3 + C2H4O = C2H7NO',
  'C2H4|HCl': 'C2H4 + HCl = CH3CH2Cl',
  'C2H5Br|NaOH': 'C2H5Br + NaOH = C2H5OH + NaBr',
  'C2H5Cl|NaOH': 'C2H5Cl + NaOH = C2H5OH + NaCl',
  'C2H5OH|CH3COOH': 'CH3COOH + C2H5OH = CH3COOC2H5 + H2O',
  'C2H5OH|HBr': 'C2H5OH + HBr = C2H5Br + H2O',
  'C2H5OH|NH3': 'NH3 + C2H5OH = C2H5NH2 + H2O',
  'C2H5OH|Na': '2C2H5OH + 2Na = 2C2H5ONa + H2',
  'C2H5OH|O2': 'C2H5OH + 3O2 = 2CO2 + 3H2O',
  'C2H6|Cl2': 'C2H6 + Cl2 = C2H5Cl + HCl',
  'C6H12O6|Cu(OH)2': 'C6H12O6 + 2Cu(OH)2 = C6H12O7 + Cu2O + 2H2O',
  'C6H5Br|NaOH': 'C6H5Br + 2NaOH = C6H5ONa + NaBr + H2O',
  'C6H5CH2Cl|NH3': '2NH3 + C6H5CH2Cl = C6H5CH2NH2 + NH4Cl',
  'C6H5CH3|HNO3': 'C6H5CH3 + 3HNO3 = C6H2(NO2)3CH3 + 3H2O',
  'C6H5COOH|NH3·H2O': 'NH3·H2O + C6H5COOH = C6H5COONH4 + H2O',
  'C6H5Cl|NaOH': 'C6H5Cl + 2NaOH = C6H5ONa + NaCl + H2O',
  'C6H5OH|NH3·H2O': 'NH3·H2O + C6H5OH = C6H5ONH4 + H2O',
  'C6H5OH|NaOH': 'C6H5OH + NaOH = C6H5ONa + H2O',
  'C6H5ONa|CO2': 'C6H5ONa + CO2 + H2O = C6H5OH + NaHCO3',
  'C6H5ONa|HCl': 'C6H5ONa + HCl = C6H5OH + NaCl',
  'C6H6|Cl2': 'C6H6 + Cl2 = C6H5Cl + HCl',
  'C6H6|H2': 'C6H6 + 3H2 = C6H12',
  'C6H6|HNO3': 'C6H6 + HNO3 = C6H5NO2 + H2O',
  'CH3CH2Br|NH3': '2NH3 + CH3CH2Br = CH3CH2NH2 + NH4Br',
  'CH3CH2CH2Br|KOH': 'CH3CH2CH2Br + KOH = CH3CH=CH2 + KBr + H2O',
  'CH3CH2COOH|NH3·H2O': 'NH3·H2O + CH3CH2COOH = CH3CH2COONH4 + H2O',
  'CH3CHO|Cu(OH)2': 'CH3CHO + 2Cu(OH)2 + NaOH = CH3COONa + Cu2O + 3H2O',
  'CH3COCl|NH3': '2NH3 + CH3COCl = CH3CONH2 + NH4Cl',
  'CH3COOC2H5|NaOH': 'CH3COOC2H5 + NaOH = CH3COONa + C2H5OH',
  'CH3COOH|NH3': 'NH3 + CH3COOH = CH3COONH4',
  'CH3COOH|Na': '2CH3COOH + 2Na = 2CH3COONa + H2',
  'CH3COOH|Na2CO3': '2CH3COOH + Na2CO3 = 2CH3COONa + CO2 + H2O',
  'CH3COOH|NaClO': 'NaClO + CH3COOH = CH3COONa + HClO',
  'CH3COOH|NaOH': 'CH3COOH + NaOH = CH3COONa + H2O',
  'CH3COONa|NaOH': 'CH3COONa + NaOH = Na2CO3 + CH4',
  'CH3I|NH3': 'NH3 + CH3I = CH3NH3I',
  'CH3OH|O2': '2CH3OH + 3O2 = 2CO2 + 4H2O',
  'CH4|Cl2': 'CH4 + Cl2 = CH3Cl + HCl',
  'CH4|O2': 'CH4 + 2O2 = CO2 + 2H2O',
  'CO2|Ca(ClO)2': 'Ca(ClO)2 + CO2 + H2O = CaCO3 + 2HClO',
  'CO2|Ca(OH)2': 'CO₂ + Ca(OH)₂ = CaCO₃↓ + H₂O',
  'CO2|CaO': 'CaO + CO₂ = CaCO₃',
  'CO2|H2O': 'CO₂ + H₂O = H₂CO₃',
  'CO2|KO2': '4KO2 + 2CO2 = 2K2CO3 + 3O2',
  'CO2|KOH': '2KOH + CO2 = K2CO3 + H2O',
  'CO2|Mg': '2Mg + CO₂ = 2MgO + C',
  'CO2|MgO': 'MgO + CO₂ = MgCO₃',
  'CO2|NH3': '2NH3 + CO2 = NH2COONH4',
  'CO2|NH3·H2O': '2NH3·H2O + CO2 = (NH4)2CO3 + H2O',
  'CO2|Na2O': 'Na₂O + CO₂ = Na₂CO₃',
  'CO2|Na2O2': '2Na₂O₂ + 2CO₂ = 2Na₂CO₃ + O₂',
  'CO2|NaAlO2': '2NaAlO2 + CO2 + 3H2O = 2Al(OH)3 + Na2CO3',
  'CO2|NaClO': 'NaClO + CO2 + H2O = NaHCO3 + HClO',
  'CO2|NaOH': 'CO₂ + 2NaOH = Na₂CO₃ + H₂O',
  'COCl2|NH3': '4NH3 + COCl2 = (NH2)2CO + 2NH4Cl',
  'CO|CuO': 'CO + CuO = Cu + CO₂',
  'CO|Fe2O3': 'Fe₂O₃ + 3CO = 2Fe + 3CO₂',
  'CO|MnO2': 'MnO2 + 2CO = Mn + 2CO2',
  'CO|O2': '2CO + O₂ = 2CO₂',
  'CO|PdCl2': 'CO + PdCl2 + H2O = CO2 + Pd + 2HCl',
  'CS2|NH3': '2NH3 + CS2 = NH4SCN + H2S',
  'Ca(ClO)2|H2O2': 'Ca(ClO)2 + 2H2O2 = CaCl2 + 2O2 + 2H2O',
  'Ca(ClO)2|HCl': 'Ca(ClO)2 + 4HCl = CaCl2 + 2Cl2 + 2H2O',
  'Ca(H2PO4)2|Ca(OH)2': 'Ca(H2PO4)2 + 2Ca(OH)2 = Ca3(PO4)2 + 4H2O',
  'Ca(HCO3)2|Ca(OH)2': 'Ca(HCO3)2 + Ca(OH)2 = 2CaCO3 + 2H2O',
  'Ca(NO3)2|K2CO3': 'K2CO3 + Ca(NO3)2 = CaCO3 + 2KNO3',
  'Ca(NO3)2|Na2CO3': 'Ca(NO3)2 + Na2CO3 = CaCO3 + 2NaNO3',
  'Ca(OH)2|Cl2': '2Cl₂ + 2Ca(OH)₂ = CaCl₂ + Ca(ClO)₂ + 2H₂O',
  'Ca(OH)2|H3PO4': '2H₃PO₄ + 3Ca(OH)₂ = Ca₃(PO₄)₂↓ + 6H₂O',
  'Ca(OH)2|HCl': '2HCl + Ca(OH)₂ = CaCl₂ + 2H₂O',
  'Ca(OH)2|HNO3': '2HNO3 + Ca(OH)2 = Ca(NO3)2 + 2H2O',
  'Ca(OH)2|Mg(HCO3)2': 'Mg(HCO3)2 + 2Ca(OH)2 = Mg(OH)2 + 2CaCO3 + 2H2O',
  'Ca(OH)2|NH4Cl': '2NH4Cl + Ca(OH)2 = CaCl2 + 2NH3 + 2H2O',
  'Ca(OH)2|Na2CO3': 'Ca(OH)₂ + Na₂CO₃ = CaCO₃↓ + 2NaOH',
  'Ca(OH)2|P2O5': 'P₂O₅ + 3Ca(OH)₂ = Ca₃(PO₄)₂↓ + 3H₂O',
  'Ca(OH)2|SO2': 'SO₂ + Ca(OH)₂ = CaSO₃↓ + H₂O',
  'Ca(OH)2|SO3': 'SO₃ + Ca(OH)₂ = CaSO₄ + H₂O',
  'Ca3(PO4)2|H2SO4': 'Ca3(PO4)2 + 2H2SO4 = Ca(H2PO4)2 + 2CaSO4',
  'Ca3P2|H2O': 'Ca3P2 + 6H2O = 3Ca(OH)2 + 2PH3',
  'CaC2|H2O': 'CaC2 + 2H2O = Ca(OH)2 + C2H2',
  'CaCO3|HCl': 'CaCO₃ + 2HCl = CaCl₂ + H₂O + CO₂↑',
  'CaCO3|HNO3': '2HNO3 + CaCO3 = Ca(NO3)2 + CO2 + H2O',
  'CaCO3|SiO2': 'SiO2 + CaCO3 = CaSiO3 + CO2',
  'CaCl2|KF': '2KF + CaCl₂ = CaF₂↓ + 2KCl',
  'CaCl2|Na2CO3': 'Na2CO3 + CaCl2 = CaCO3 + 2NaCl',
  'CaCl2|Na2HPO4': 'Na2HPO4 + CaCl2 = CaHPO4 + 2NaCl',
  'CaCl2|Na2SiO3': 'Na2SiO3 + CaCl2 = CaSiO3 + 2NaCl',
  'CaCl2|Na3PO4': '2Na3PO4 + 3CaCl2 = Ca3(PO4)2 + 6NaCl',
  'CaCl2|NaF': '2NaF + CaCl₂ = CaF₂↓ + 2NaCl',
  'CaCl2|NaH2PO4': '2NaH2PO4 + CaCl2 = Ca(H2PO4)2 + 2NaCl',
  'CaF2|H2SO4': 'CaF2 + H2SO4 = CaSO4 + 2HF',
  'CaH2|H2O': 'CaH₂ + 2H₂O = Ca(OH)₂ + 2H₂↑',
  'CaH2|H2SO4': 'CaH₂ + H₂SO₄ = CaSO₄ + 2H₂↑',
  'CaH2|HCl': 'CaH₂ + 2HCl = CaCl₂ + 2H₂↑',
  'CaO|H2O': 'CaO + H₂O = Ca(OH)₂',
  'CaO|HCl': 'CaO + 2HCl = CaCl₂ + H₂O',
  'CaO|HF': '2HF + CaO = CaF₂ + H₂O',
  'CaO|HNO3': 'CaO + 2HNO₃ = Ca(NO₃)₂ + H₂O',
  'CaO|P2O5': '3CaO + P2O5 = Ca3(PO4)2',
  'CaO|SO2': 'CaO + SO₂ = CaSO₃',
  'CaO|SO3': 'CaO + SO₃ = CaSO₄',
  'CaO|SiO2': 'SiO2 + CaO = CaSiO3',
  'CaSiO3|HCl': 'CaSiO3 + 2HCl = CaCl2 + H2SiO3',
  'CaSiO3|HF': '6HF + CaSiO3 = CaF2 + SiF4 + 3H2O',
  'Ca|Cl2': 'Ca + Cl₂ = CaCl₂',
  'Ca|F2': 'F₂ + Ca = CaF₂',
  'Ca|H2': 'Ca + H₂ = CaH₂',
  'Ca|H2O': 'Ca + 2H₂O = Ca(OH)₂ + H₂↑',
  'Ca|H2S': 'Ca + H₂S = CaS + H₂↑',
  'Ca|H2SO3': 'Ca + H₂SO₃ = BaSO₃ + H₂↑',
  'Ca|H2SO4': 'Ca + H₂SO₄ = CaSO₄ + H₂↑',
  'Ca|H3PO4': '3Ca + 2H₃PO₄ = Ca₃(PO₄)₂↓ + 3H₂↑',
  'Ca|HBr': 'Ca + 2HBr = CaBr₂ + H₂↑',
  'Ca|HCl': 'Ca + 2HCl = CaCl₂ + H₂↑',
  'Ca|HF': 'Ca + 2HF = CaF₂ + H₂↑',
  'Ca|HI': 'Ca + 2HI = CaI₂ + H₂↑',
  'Ca|HNO3': '4Ca + 10HNO₃ = 4Ca(NO₃)₂ + NH₄NO₃ + 3H₂O',
  'Ca|I2': 'Ca + I₂ = CaI₂',
  'Ca|O2': '2Ca + O₂ = 2CaO',
  'Ca|S': 'Ca + S = CaS',
  'CdSO4|Na2S': 'Na2S + CdSO4 = CdS + Na2SO4',
  'Cl2|Cu': 'Cu + Cl₂ = CuCl₂',
  'Cl2|Fe': '2Fe + 3Cl₂ = 2FeCl₃',
  'Cl2|FeBr2': '3Cl2 + 2FeBr2 = 2FeCl3 + 2Br2',
  'Cl2|FeCl2': 'Cl₂ + 2FeCl₂ = 2FeCl₃',
  'Cl2|FeSO4': '3Cl₂ + 6FeSO₄ = 2Fe₂(SO₄)₃ + 2FeCl₃',
  'Cl2|H2': 'Cl₂ + H₂ = 2HCl',
  'Cl2|H2O': 'Cl₂ + H₂O = HCl + HClO',
  'Cl2|H2O2': 'Cl2 + H2O2 = 2HCl + O2',
  'Cl2|H2S': 'Cl₂ + H₂S = S↓ + 2HCl',
  'Cl2|HBr': 'Cl2 + 2HBr = 2HCl + Br2',
  'Cl2|HI': 'Cl2 + 2HI = 2HCl + I2',
  'Cl2|Hg': 'Hg + Cl₂ = HgCl₂',
  'Cl2|K': '2K + Cl₂ = 2KCl',
  'Cl2|K2MnO4': '2K2MnO4 + Cl2 = 2KMnO4 + 2KCl',
  'Cl2|KBr': 'Cl₂ + 2KBr = 2KCl + Br₂',
  'Cl2|KI': 'Cl₂ + 2KI = 2KCl + I₂',
  'Cl2|Mg': 'Mg + Cl₂ = MgCl₂',
  'Cl2|Mn': 'Mn + Cl2 = MnCl2',
  'Cl2|NH3': '8NH3 + 3Cl2 = 6NH4Cl + N2',
  'Cl2|Na': '2Na + Cl₂ = 2NaCl',
  'Cl2|Na2S': 'Cl2 + Na2S = 2NaCl + S',
  'Cl2|Na2SO3': 'Cl₂ + Na₂SO₃ + H₂O = Na₂SO₄ + 2HCl',
  'Cl2|NaBr': 'Cl₂ + 2NaBr = 2NaCl + Br₂',
  'Cl2|NaClO2': '2NaClO2 + Cl2 = 2NaCl + 2ClO2',
  'Cl2|NaI': 'Cl₂ + 2NaI = 2NaCl + I₂',
  'Cl2|NaOH': 'Cl₂ + 2NaOH = NaCl + NaClO + H₂O',
  'Cl2|O2': '2Cl₂ + 7O₂ = 2Cl₂O₇',
  'Cl2|P': '2P + 3Cl₂ = 2PCl₃',
  'Cl2|SO2': 'SO2 + Cl2 + 2H2O = H2SO4 + 2HCl',
  'Cl2|Zn': 'Zn + Cl₂ = ZnCl₂',
  'CoCl2|NH3·H2O': '6NH3·H2O + CoCl2 = [Co(NH3)6]Cl2 + 6H2O',
  'CoCl2|Na2SiO3': 'Na2SiO3 + CoCl2 = CoSiO3 + 2NaCl',
  'CrCl3|NH3·H2O': '3NH3·H2O + CrCl3 = Cr(OH)3 + 3NH4Cl',
  'Cu|F2': 'F₂ + Cu = CuF₂',
  'Cu|FeCl3': '2FeCl₃ + Cu = 2FeCl₂ + CuCl₂',
  'Cu|H2SO4': 'Cu + 2H₂SO₄(浓) = CuSO₄ + SO₂↑ + 2H₂O',
  'Cu|HNO3': 'Cu + 4HNO₃(浓) = Cu(NO₃)₂ + 2NO₂↑ + 2H₂O',
  'Cu|HgCl2': 'Cu + HgCl2 = CuCl2 + Hg',
  'Cu|I2': '2Cu + I₂ = 2CuI',
  'Cu|O2': '4Cu + O₂ = 2Cu₂O',
  'Cu|S': '2Cu + S = Cu₂S',
  'Cu(NO3)2|Fe': 'Fe + Cu(NO3)2 = Fe(NO3)2 + Cu',
  'Cu(OH)2|HCl': 'Cu(OH)₂ + 2HCl = CuCl₂ + 2H₂O',
  'Cu(OH)2|NH3·H2O': 'Cu(OH)2 + 4NH3·H2O = [Cu(NH3)4](OH)2 + 4H2O',
  'Cu2O|O2': '2Cu₂O + O₂ = 4CuO',
  'Cu2S|O2': 'Cu2S + 2O2 = 2CuO + SO2',
  'CuBr2|Fe': 'Fe + CuBr2 = FeBr2 + Cu',
  'CuBr2|Zn': 'Zn + CuBr2 = ZnBr2 + Cu',
  'CuCl2|Fe': 'Fe + CuCl₂ = FeCl₂ + Cu',
  'CuCl2|H2S': 'H2S + CuCl2 = CuS + 2HCl',
  'CuCl2|Mg': 'Mg + CuCl₂ = MgCl₂ + Cu',
  'CuCl2|NaOH': 'CuCl₂ + 2NaOH = Cu(OH)₂↓ + 2NaCl',
  'CuCl2|Zn': 'Zn + CuCl₂ = ZnCl₂ + Cu',
  'CuO|H2': 'CuO + H₂ = Cu + H₂O',
  'CuO|H2SO4': 'CuO + H₂SO₄ = CuSO₄ + H₂O',
  'CuO|HCl': 'CuO + 2HCl = CuCl₂ + H₂O',
  'CuO|HNO3': 'CuO + 2HNO₃ = Cu(NO₃)₂ + H₂O',
  'CuO|NH3': '2NH3 + 3CuO = 3Cu + N2 + 3H2O',
  'CuSO4|Fe': 'Fe + CuSO₄ = FeSO₄ + Cu',
  'CuSO4|H2S': 'H₂S + CuSO₄ = CuS↓ + H₂SO₄',
  'CuSO4|Mg': 'Mg + CuSO₄ = MgSO₄ + Cu',
  'CuSO4|NH3·H2O': '4NH3·H2O + CuSO4 = [Cu(NH3)4]SO4 + 4H2O',
  'CuSO4|Na2CO3': 'CuSO4 + Na2CO3 + H2O = Cu(OH)2 + Na2SO4 + CO2',
  'CuSO4|Na2S': 'Na2S + CuSO4 = CuS + Na2SO4',
  'CuSO4|Na2SiO3': 'Na2SiO3 + CuSO4 = CuSiO3 + Na2SO4',
  'CuSO4|NaOH': 'CuSO4 + 2NaOH = Cu(OH)2 + Na2SO4',
  'CuSO4|Zn': 'Zn + CuSO₄ = ZnSO₄ + Cu',
  'F2|Fe': '3F₂ + 2Fe = 2FeF₃',
  'F2|H2': 'F₂ + H₂ = 2HF',
  'F2|H2O': '2F₂ + 2H₂O = 4HF + O₂',
  'F2|Hg': 'F₂ + Hg = HgF₂',
  'F2|K': 'F₂ + 2K = 2KF',
  'F2|KBr': 'F₂ + 2KBr = 2KF + Br₂',
  'F2|KCl': 'F₂ + 2KCl = 2KF + Cl₂',
  'F2|KI': 'F₂ + 2KI = 2KF + I₂',
  'F2|Mg': 'F₂ + Mg = MgF₂',
  'F2|NH3': '3F₂ + 2NH₃ = 6HF + N₂',
  'F2|Na': 'F₂ + 2Na = 2NaF',
  'F2|NaBr': 'F₂ + 2NaF + Br₂ = 2NaF + Br₂',
  'F2|NaCl': 'F₂ + 2NaCl = 2NaF + Cl₂',
  'F2|NaI': 'F₂ + 2NaI = 2NaF + I₂',
  'F2|P': '5F₂ + 2P = 2PF₅',
  'F2|S': '3F₂ + S = SF₆',
  'F2|Si': 'Si + 2F2 = SiF4',
  'F2|Zn': 'F₂ + Zn = ZnF₂',
  'Fe|FeCl3': '2FeCl₃ + Fe = 3FeCl₂',
  'Fe|H2S': 'Fe + H₂S = FeS + H₂↑',
  'Fe|H2SO3': 'Fe + H₂SO₃ = FeSO₃ + H₂↑',
  'Fe|H2SO4': 'Fe + H₂SO₄ = FeSO₄ + H₂↑',
  'Fe|H3PO2': 'Fe + 2H3PO2 = Fe(H2PO2)2 + H2',
  'Fe|H3PO3': 'Fe + 2H3PO3 = Fe(H2PO3)2 + H2',
  'Fe|H3PO4': '3Fe + 2H₃PO₄ = Fe₃(PO₄)₂ + 3H₂↑',
  'Fe|HBr': 'Fe + 2HBr = FeBr₂ + H₂↑',
  'Fe|HCl': 'Fe + 2HCl = FeCl₂ + H₂↑',
  'Fe|HI': 'Fe + 2HI = FeI₂ + H₂↑',
  'Fe|HNO3': 'Fe + 4HNO₃(稀) = Fe(NO₃)₃ + NO↑ + 2H₂O',
  'Fe|HgCl2': 'Fe + HgCl2 = FeCl2 + Hg',
  'Fe|I2': 'Fe + I₂ = FeI₂',
  'Fe|O2': '3Fe + 2O₂ = Fe₃O₄',
  'Fe|S': 'Fe + S = FeS',
  'Fe(OH)2|HNO3': '3Fe(OH)2 + 10HNO3 = 3Fe(NO3)3 + NO + 8H2O',
  'Fe(OH)2|O2': '4Fe(OH)₂ + O₂ + 2H₂O = 4Fe(OH)₃',
  'Fe(OH)3|H2SO4': '2Fe(OH)₃ + 3H₂SO₄ = Fe₂(SO₄)₃ + 6H₂O',
  'Fe(OH)3|HI': '2Fe(OH)3 + 6HI = 2FeI2 + I2 + 6H2O',
  'Fe2O3|H2': '3H₂ + Fe₂O₃ = 2Fe + 3H₂O',
  'Fe2O3|H2SO4': 'Fe₂O₃ + 3H₂SO₄ = Fe₂(SO₄)₃ + 3H₂O',
  'Fe2O3|HCl': 'Fe₂O₃ + 6HCl = 2FeCl₃ + 3H₂O',
  'Fe2O3|HNO3': 'Fe₂O₃ + 6HNO₃ = 2Fe(NO₃)₃ + 3H₂O',
  'Fe3(PO4)2|HCl': 'Fe3(PO4)2 + 6HCl = 3FeCl2 + 2H3PO4',
  'Fe3(PO4)2|NaOH': 'Fe3(PO4)2 + 6NaOH = 3Fe(OH)2 + 2Na3PO4',
  'FeCl2|K2Cr2O7': '6FeCl2 + K2Cr2O7 + 14HCl = 6FeCl3 + 2KCl + 2CrCl3 + 7H2O',
  'FeCl2|Mg': 'Mg + FeCl₂ = MgCl₂ + Fe',
  'FeCl2|Na2HPO3': 'FeCl2 + Na2HPO3 = FeHPO3 + 2NaCl',
  'FeCl2|Na2HPO4': '3FeCl2 + 4Na2HPO4 = Fe3(PO4)2 + 2NaH2PO4 + 6NaCl',
  'FeCl2|Na3PO4': '3FeCl2 + 2Na3PO4 = Fe3(PO4)2 + 6NaCl',
  'FeCl2|Zn': 'Zn + FeCl₂ = ZnCl₂ + Fe',
  'FeCl3|H2S': '2FeCl₃ + H₂S = 2FeCl₂ + S↓ + 2HCl',
  'FeCl3|KI': '2FeCl₃ + 2KI = 2FeCl₂ + 2KCl + I₂',
  'FeCl3|KOH': '3KOH + FeCl3 = Fe(OH)3 + 3KCl',
  'FeCl3|NH3·H2O': '3NH3·H2O + FeCl3 = Fe(OH)3 + 3NH4Cl',
  'FeCl3|NH4SCN': '3NH4SCN + FeCl3 = Fe(SCN)3 + 3NH4Cl',
  'FeCl3|Na2CO3': '2FeCl3 + 3Na2CO3 + 3H2O = 2Fe(OH)3 + 6NaCl + 3CO2',
  'FeCl3|Na2HPO3': '2FeCl3 + 3Na2HPO3 = Fe2(HPO3)3 + 6NaCl',
  'FeCl3|Na2HPO4': 'FeCl3 + 2Na2HPO4 = FePO4 + NaH2PO4 + 3NaCl',
  'FeCl3|Na2S': '3Na2S + 2FeCl3 + 6H2O = 2Fe(OH)3 + 3H2S + 6NaCl',
  'FeCl3|Na2SO3': '2FeCl₃ + Na₂SO₃ + H₂O = 2FeCl₂ + Na₂SO₄ + 2HCl',
  'FeCl3|Na3PO4': 'FeCl3 + Na3PO4 = FePO4 + 3NaCl',
  'FeCl3|NaOH': 'FeCl₃ + 3NaOH = Fe(OH)₃↓ + 3NaCl',
  'FeCl3|Zn': 'Zn + 2FeCl3 = ZnCl2 + 2FeCl2',
  'FeO|HNO3': 'FeO + 4HNO₃(浓) = Fe(NO₃)₃ + NO₂↑ + 2H₂O',
  'FeO|O2': '4FeO + O₂ = 2Fe₂O₃',
  'FePO4|HCl': 'FePO4 + 3HCl = FeCl3 + H3PO4',
  'FePO4|NaOH': 'FePO4 + 3NaOH = Fe(OH)3 + Na3PO4',
  'FeS|HCl': 'FeS + 2HCl = FeCl2 + H2S',
  'FeS|O2': '4FeS + 7O2 = 2Fe2O3 + 4SO2',
  'FeSO4|H2O2': 'H₂O₂ + 2FeSO₄ + H₂SO₄ = Fe₂(SO₄)₃ + 2H₂O',
  'FeSO4|K2Cr2O7': 'K2Cr2O7 + 6FeSO4 + 7H2SO4 = Cr2(SO4)3 + 3Fe2(SO4)3 + K2SO4 + 7H2O',
  'FeSO4|KMnO4': '10FeSO4 + 2KMnO4 + 8H2SO4 = 5Fe2(SO4)3 + 2MnSO4 + K2SO4 + 8H2O',
  'FeSO4|Mg': 'Mg + FeSO₄ = MgSO₄ + Fe',
  'FeSO4|NH3·H2O': '2NH3·H2O + FeSO4 = Fe(OH)2 + (NH4)2SO4',
  'FeSO4|Na2CO3': 'FeSO4 + Na2CO3 = FeCO3 + Na2SO4',
  'FeSO4|Na2O2': '3Na₂O₂ + 6FeSO₄ + 6H₂O = 4Fe(OH)₃↓ + 2Fe₂(SO₄)₃ + 6Na⁺',
  'FeSO4|Na2S': 'Na2S + FeSO4 = FeS + Na2SO4',
  'FeSO4|Na2SiO3': 'Na2SiO3 + FeSO4 = FeSiO3 + Na2SO4',
  'FeSO4|NaOH': '2NaOH + FeSO4 = Fe(OH)2 + Na2SO4',
  'FeSO4|Zn': 'Zn + FeSO₄ = ZnSO₄ + Fe',
  'H2|I2': 'I₂ + H₂ = 2HI',
  'H2|K': '2K + H₂ = 2KH',
  'H2|Mg': 'Mg + H₂ = MgH₂',
  'H2|MnO': 'MnO + H2 = Mn + H2O',
  'H2|N2': 'N₂ + 3H₂ = 2NH₃',
  'H2|Na': '2Na + H₂ = 2NaH',
  'H2|O2': '2H₂ + O₂ = 2H₂O',
  'H2|S': 'H₂ + S = H₂S',
  'H2C2O4|KMnO4': '5H2C2O4 + 2KMnO4 + 3H2SO4 = K2SO4 + 2MnSO4 + 10CO2 + 8H2O',
  'H2C2O4|MnO2': 'MnO2 + H2C2O4 + H2SO4 = MnSO4 + 2CO2↑ + 2H2O',
  'H2C2O4|NH3·H2O': '2NH3·H2O + H2C2O4 = (NH4)2C2O4 + 2H2O',
  'H2CO3|NH3': '2NH3 + H2CO3 = (NH4)2CO3',
  'H2O|K': '2K + 2H₂O = 2KOH + H₂↑',
  'H2O|K2O': 'K₂O + H₂O = 2KOH',
  'H2O|KH': 'KH + H₂O = KOH + H₂↑',
  'H2O|Mg2C3': 'Mg2C3 + 4H2O = 2Mg(OH)2 + C3H4',
  'H2O|Mg3N2': 'Mg3N2 + 6H2O = 3Mg(OH)2 + 2NH3',
  'H2O|MgH2': 'MgH₂ + 2H₂O = Mg(OH)₂ + 2H₂↑',
  'H2O|MgO': 'MgO + H₂O = Mg(OH)₂',
  'H2O|NH3': 'NH3 + H2O = NH3·H2O',
  'H2O|NO2': '3NO₂ + H₂O = 2HNO₃ + NO',
  'H2O|Na': '2Na + 2H₂O = 2NaOH + H₂↑',
  'H2O|Na2O': 'Na₂O + H₂O = 2NaOH',
  'H2O|Na2O2': '2Na₂O₂ + 2H₂O = 4NaOH + O₂↑',
  'H2O|NaH': 'NaH + H₂O = NaOH + H₂↑',
  'H2O|P2O5': 'P2O5 + 3H2O = 2H3PO4',
  'H2O|PCl3': 'PCl3 + 3H2O = H3PO3 + 3HCl',
  'H2O|PCl5': 'PCl5 + 4H2O = H3PO4 + 5HCl',
  'H2O|SO2': 'SO₂ + H₂O = H₂CO₃',
  'H2O|SO3': 'SO₃ + H₂O = H₂SO₄',
  'H2O|SiCl4': 'SiCl4 + 4H2O = H4SiO4 + 4HCl',
  'H2O2|H2S': 'H₂O₂ + H₂S = S↓ + 2H₂O',
  'H2O2|H2SO3': 'H2SO3 + H2O2 = H2SO4 + H2O',
  'H2O2|H5IO6': 'H5IO6 + H2O2 = HIO3 + O2 + 3H2O',
  'H2O2|HClO': 'HClO + H2O2 = HCl + H2O + O2',
  'H2O2|KI': 'H₂O₂ + 2KI = 2KOH + I₂',
  'H2O2|KMnO4': '2KMnO4 + 5H2O2 + 3H2SO4 = 2MnSO4 + K2SO4 + 5O2 + 8H2O',
  'H2O2|MnO2': 'MnO2 + H2O2 + H2SO4 = MnSO4 + O2↑ + 2H2O',
  'H2O2|NH3·H2O': 'NH3·H2O + H2O2 = NH4HO2 + H2O',
  'H2O2|Na2SO3': 'H₂O₂ + Na₂SO₃ = Na₂SO₄ + H₂O',
  'H2O2|NaClO': 'NaClO + H2O2 = NaCl + H2O + O2',
  'H2O2|NaClO2': '2NaClO2 + H2O2 = 2ClO2 + 2NaOH',
  'H2O2|SO2': 'H₂O₂ + SO₂ = H₂SO₄',
  'H2S|HClO3': 'HClO3 + 3H2S = HCl + 3S + 3H2O',
  'H2S|I2': 'I2 + H2S = 2HI + S',
  'H2S|K': '2K + H₂S = K₂S + H₂↑',
  'H2S|Mg': 'Mg + H₂S = MgS + H₂↑',
  'H2S|NH3': '2NH3 + H2S = (NH4)2S',
  'H2S|NH3·H2O': '2NH3·H2O + H2S = (NH4)2S + 2H2O',
  'H2S|Na': '2Na + H₂S = Na₂S + H₂↑',
  'H2S|Na2O2': 'Na₂O₂ + H₂S = 2NaOH + S↓',
  'H2S|O2': '2H₂S + 3O₂ = 2SO₂ + 2H₂O',
  'H2S|Pb(ClO4)2': 'Pb(ClO4)2 + H2S = PbS + 2HClO4',
  'H2S|Pb(NO3)2': 'H2S + Pb(NO3)2 = PbS + 2HNO3',
  'H2S|SO2': '2H₂S + SO₂ = 3S↓ + 2H₂O',
  'H2S|Zn': 'Zn + H₂S = ZnS↓ + H₂↑',
  'H2SO3|K': '2K + H₂SO₃ = K₂SO₃ + H₂↑',
  'H2SO3|Mg': 'Mg + H₂SO₃ = MgSO₃ + H₂↑',
  'H2SO3|Na': '2Na + H₂SO₃ = Na₂SO₃ + H₂↑',
  'H2SO3|NaOH': 'H₂SO₃ + 2NaOH = Na₂SO₃ + 2H₂O',
  'H2SO3|O2': '2H₂SO₃ + O₂ = 2H₂SO₄',
  'H2SO4|K': '2K + H₂SO₄ = K₂SO₄ + H₂↑',
  'H2SO4|KBrO3': '2KBrO3 + H2SO4 = K2SO4 + 2HBrO3',
  'H2SO4|KClO3': '2KClO3 + H2SO4 = K2SO4 + 2HClO3',
  'H2SO4|KClO4': 'KClO4 + H2SO4 = KHSO4 + HClO4',
  'H2SO4|KIO3': '2KIO3 + H2SO4 = K2SO4 + 2HIO3',
  'H2SO4|KOH': 'H2SO4 + 2KOH = K2SO4 + 2H2O',
  'H2SO4|Mg': 'Mg + H₂SO₄ = MgSO₄ + H₂↑',
  'H2SO4|MgO': 'MgO + H₂SO₄ = MgSO₄ + H₂O',
  'H2SO4|MnO2': '2MnO2 + 2H2SO4 = 2MnSO4 + O2 + 2H2O',
  'H2SO4|NH3': '2NH₃ + H₂SO₄ = (NH₄)₂SO₄',
  'H2SO4|NH3·H2O': '2NH3·H2O + H2SO4 = (NH4)2SO4 + 2H2O',
  'H2SO4|NH4ClO4': '2NH4ClO4 + H2SO4 = (NH4)2SO4 + 2HClO4',
  'H2SO4|NH4NO3': '2NH4NO3 + H2SO4 = (NH4)2SO4 + 2HNO3',
  'H2SO4|Na': '2Na + H₂SO₄ = Na₂SO₄ + 2H₂↑',
  'H2SO4|Na2CO3': 'H2SO4 + Na2CO3 = Na2SO4 + CO2 + H2O',
  'H2SO4|Na2O': 'Na₂O + H₂SO₄ = Na₂SO₄ + H₂O',
  'H2SO4|Na2S2O3': 'Na2S2O3 + H2SO4 = Na2SO4 + S + SO2 + H2O',
  'H2SO4|Na2SO3': 'H2SO4 + Na2SO3 = Na2SO4 + SO2 + H2O',
  'H2SO4|NaClO': '2NaClO + H2SO4 = Na2SO4 + 2HClO',
  'H2SO4|NaF': '2NaF + H2SO4 = Na2SO4 + 2HF',
  'H2SO4|NaH': '2NaH + H₂SO₄ = Na₂SO₄ + 2H₂↑',
  'H2SO4|NaOH': 'H₂SO₄ + 2NaOH = Na₂SO₄ + 2H₂O',
  'H2SO4|S': 'S + 2H₂SO₄(浓) = 3SO₂↑ + 2H₂O',
  'H2SO4|Zn': 'Zn + H₂SO₄ = ZnSO₄ + H₂↑',
  'H3PO4|K': '6K + 2H₃PO₄ = 2K₃PO₄ + 3H₂↑',
  'H3PO4|KOH': 'H₃PO₄ + 3KOH = K₃PO₄ + 3H₂O',
  'H3PO4|Mg': '3Mg + 2H₃PO₄ = Mg₃(PO₄)₂ + 3H₂↑',
  'H3PO4|NH3': '3NH3 + H3PO4 = (NH4)3PO4',
  'H3PO4|NH3·H2O': '3NH3·H2O + H3PO4 = (NH4)3PO4 + 3H2O',
  'H3PO4|Na': '6Na + 2H₃PO₄ = 2Na₃PO₄ + 3H₂↑',
  'H3PO4|NaOH': 'H₃PO₄ + 3NaOH = Na₃PO₄ + 3H₂O',
  'H3PO4|Zn': '3Zn + 2H₃PO₄ = Zn₃(PO₄)₂ + 3H₂↑',
  'HBr|K': '2K + 2HBr = 2KBr + H₂↑',
  'HBr|KOH': 'HBr + KOH = KBr + H₂O',
  'HBr|Mg': 'Mg + 2HBr = MgBr₂ + H₂↑',
  'HBr|NH3·H2O': 'NH3·H2O + HBr = NH4Br + H2O',
  'HBr|Na': '2Na + 2HBr = 2NaBr + H₂↑',
  'HBr|Zn': 'Zn + 2HBr = ZnBr₂ + H₂↑',
  'HCHO|NH3': '4NH3 + 6HCHO = C6H12N4 + 6H2O',
  'HCOOH|KMnO4': '5HCOOH + 2KMnO4 + 3H2SO4 = K2SO4 + 2MnSO4 + 5CO2 + 8H2O',
  'HCOOH|NH3·H2O': 'NH3·H2O + HCOOH = HCOONH4 + H2O',
  'HCOONa|NaOH': 'HCOONa + NaOH = Na2CO3 + H2',
  'HCl|K': '2K + 2HCl = 2KCl + H₂↑',
  'HCl|K2CO3': 'K2CO3 + 2HCl = 2KCl + CO2 + H2O',
  'HCl|KClO3': 'KClO3 + 6HCl = KCl + 3Cl2 + 3H2O',
  'HCl|KH': 'KH + HCl = KCl + H₂↑',
  'HCl|KMnO4': '2KMnO4 + 16HCl = 2MnCl2 + 2KCl + 5Cl2 + 8H2O',
  'HCl|Mg': 'Mg + 2HCl = MgCl₂ + H₂↑',
  'HCl|MgH2': 'MgH₂ + 2HCl = MgCl₂ + 2H₂↑',
  'HCl|MgO': 'MgO + 2HCl = MgCl₂ + H₂O',
  'HCl|Mn': 'Mn + 2HCl = MnCl2 + H2',
  'HCl|Mn(OH)2': 'Mn(OH)2 + 2HCl = MnCl2 + 2H2O',
  'HCl|MnCO3': 'MnCO3 + 2HCl = MnCl2 + CO2 + H2O',
  'HCl|MnO2': 'MnO2 + 4HCl = MnCl2 + Cl2 + 2H2O',
  'HCl|MnS': 'MnS + 2HCl = MnCl2 + H2S↑',
  'HCl|NH3': 'NH₃ + HCl = NH₄Cl',
  'HCl|NH3·H2O': 'NH3·H2O + HCl = NH4Cl + H2O',
  'HCl|NH4HCO3': 'NH4HCO3 + HCl = NH4Cl + CO2 + H2O',
  'HCl|Na': '2Na + 2HCl = 2NaCl + H₂↑',
  'HCl|Na2CO3': 'Na₂CO₃ + 2HCl = 2NaCl + H₂O + CO₂↑',
  'HCl|Na2O': 'Na₂O + 2HCl = 2NaCl + H₂O',
  'HCl|Na2S': 'Na₂S + 2HCl = 2NaCl + H₂S↑',
  'HCl|Na2SiO3': 'Na2SiO3 + 2HCl = H2SiO3 + 2NaCl',
  'HCl|NaClO': 'NaClO + 2HCl = NaCl + Cl2 + H2O',
  'HCl|NaClO2': '5NaClO2 + 4HCl = 4ClO2 + 5NaCl + 2H2O',
  'HCl|NaClO3': 'NaClO3 + 6HCl = NaCl + 3Cl2 + 3H2O',
  'HCl|NaH': 'NaH + HCl = NaCl + H₂↑',
  'HCl|NaHCO3': 'NaHCO₃ + HCl = NaCl + H₂O + CO₂↑',
  'HCl|NaOH': 'HCl + NaOH = NaCl + H₂O',
  'HCl|PH3': 'PH3 + HCl = PH4Cl',
  'HCl|Zn': 'Zn + 2HCl = ZnCl₂ + H₂↑',
  'HClO|HI': 'HClO + 2HI = HCl + I2 + H2O',
  'HClO|NH3': '3HClO + 2NH3 = 3HCl + N2 + 3H2O',
  'HClO|NaOH': 'HClO + NaOH = NaClO + H2O',
  'HClO2|HI': 'HClO2 + 4HI = HCl + 2I2 + 2H2O',
  'HClO2|NaOH': 'HClO2 + NaOH = NaClO2 + H2O',
  'HClO3|HI': 'HClO3 + 6HI = HCl + 3I2 + 3H2O',
  'HClO3|NaOH': 'HClO3 + NaOH = NaClO3 + H2O',
  'HClO4|HI': 'HClO4 + 8HI = HCl + 4I2 + 4H2O',
  'HClO4|NH3': 'HClO4 + NH3 = NH4ClO4',
  'HClO4|NaOH': 'HClO4 + NaOH = NaClO4 + H2O',
  'HClO4|P2O5': '2HClO4 + P2O5 = Cl2O7 + 2HPO3',
  'HClO4|P4O10': '12HClO4 + P4O10 = 4H3PO4 + 6Cl2O7',
  'HF|K': '2K + 2HF = 2KF + H₂↑',
  'HF|KOH': 'HF + KOH = KF + H₂O',
  'HF|Mg': 'Mg + 2HF = MgF₂ + H₂↑',
  'HF|MgO': '2HF + MgO = MgF₂ + H₂O',
  'HF|Na': '2Na + 2HF = 2NaF + H₂↑',
  'HF|NaOH': 'HF + NaOH = NaF + H₂O',
  'HF|SiF4': 'SiF4 + 2HF = H2SiF6',
  'HF|SiO2': '4HF + SiO₂ = SiF₄↑ + 2H₂O',
  'HF|Zn': 'Zn + 2HF = ZnF₂ + H₂↑',
  'HI|K': '2K + 2HI = 2KI + H₂↑',
  'HI|Mg': 'Mg + 2HI = MgI₂ + H₂↑',
  'HI|MnO2': 'MnO2 + 4HI = MnI2 + I2 + 2H2O',
  'HI|NH3·H2O': 'NH3·H2O + HI = NH4I + H2O',
  'HI|Na': '2Na + 2HI = 2NaI + H₂↑',
  'HI|NaOH': 'HI + NaOH = NaI + H₂O',
  'HI|Zn': 'Zn + 2HI = ZnI₂ + H₂↑',
  'HNO3|Hg': 'Hg + 4HNO₃(浓) = Hg(NO₃)₂ + 2NO₂↑ + 2H₂O',
  'HNO3|I2': 'I2 + 10HNO3 = 2HIO3 + 10NO2 + 4H2O',
  'HNO3|K': '8K + 10HNO₃ = 8KNO₃ + NH₄NO₃ + 3H₂O',
  'HNO3|KOH': 'HNO3 + KOH = KNO3 + H2O',
  'HNO3|Mg': 'Mg + 2HNO₃ = Mg(NO₃)₂ + H₂↑',
  'HNO3|MgO': 'MgO + 2HNO₃ = Mg(NO₃)₂ + H₂O',
  'HNO3|NH3': 'NH3 + HNO3 = NH4NO3',
  'HNO3|NH3·H2O': 'NH3·H2O + HNO3 = NH4NO3 + H2O',
  'HNO3|Na': '8Na + 10HNO₃ = 8NaNO₃ + NH₄NO₃ + 3H₂O',
  'HNO3|Na2CO3': '2HNO3 + Na2CO3 = 2NaNO3 + CO2 + H2O',
  'HNO3|NaOH': 'HNO₃ + NaOH = NaNO₃ + H₂O',
  'HNO3|P': '5HNO₃(浓) + P = H₃PO₄ + 5NO₂↑ + H₂O',
  'HNO3|S': '6HNO₃(浓) + S = H₂SO₄ + 6NO₂↑ + 2H₂O',
  'HNO3|SO2': '3SO2 + 2HNO3 + 2H2O = 3H2SO4 + 2NO',
  'HNO3|Zn': '4Zn + 10HNO₃(稀) = 4Zn(NO₃)₂ + NH₄NO₃ + 3H₂O',
  'Hg|I2': 'Hg + I₂ = HgI₂',
  'Hg|O2': '2Hg + O₂ = 2HgO',
  'Hg(NO3)2|KI': 'Hg(NO3)2 + 2KI = HgI2 + 2KNO3',
  'Hg2(ClO4)2|NaCl': 'Hg2(ClO4)2 + 2NaCl = Hg2Cl2 + 2NaClO4',
  'Hg2Cl2|NH3': '2NH3 + Hg2Cl2 = Hg + HgNH2Cl + NH4Cl',
  'HgCl2|NH3': 'NH3 + HgCl2 = HgNH2Cl + HCl',
  'I2|K': '2K + I₂ = 2KI',
  'I2|Mg': 'Mg + I₂ = MgI₂',
  'I2|NH3': '2NH3 + 3I2 = NI3·NH3 + 3HI',
  'I2|Na': '2Na + I₂ = 2NaI',
  'I2|Na2S': 'I2 + Na2S = 2NaI + S',
  'I2|Na2S2O3': 'I2 + 2Na2S2O3 = 2NaI + Na2S4O6',
  'I2|NaOH': 'I2 + 2NaOH = NaI + NaIO + H2O',
  'I2|Zn': 'Zn + I₂ = ZnI₂',
  'K|O2': 'K + O₂ = KO₂',
  'K|S': '2K + S = K₂S',
  'K2CO3|NH4Cl': '2NH4Cl + K2CO3 = 2KCl + CO2 + 2NH3 + H2O',
  'K2Cr2O7|NH4Cl': '2NH4Cl + K2Cr2O7 = (NH4)2Cr2O7 + 2KCl',
  'KCl|NaClO4': 'NaClO4 + KCl = KClO4 + NaCl',
  'KClO3|MnO2': '2KClO3 = 2KCl + 3O2↑ (MnO2为催化剂)',
  'KClO3|Na2SO3': 'KClO3 + 3Na2SO3 = KCl + 3Na2SO4',
  'KClO3|NaNO2': 'KClO3 + 3NaNO2 = KCl + 3NaNO3',
  'KClO3|S': '2KClO₃ + 3S = 2KCl + 3SO₂↑',
  'KI|KMnO4': '10KI + 2KMnO4 + 8H2SO4 = 5I2 + 2MnSO4 + 6K2SO4 + 8H2O',
  'KI|Pb(NO3)2': 'Pb(NO3)2 + 2KI = PbI2 + 2KNO3',
  'KMnO4|Na2S': '2KMnO4 + 3Na2S + 4H2O = 2MnO2 + 3S + 6NaOH + 2KOH',
  'KMnO4|Na2SO3': '5Na2SO3 + 2KMnO4 + 3H2SO4 = 5Na2SO4 + 2MnSO4 + K2SO4 + 3H2O',
  'KMnO4|SO2': '2KMnO4 + 5SO2 + 2H2O = K2SO4 + 2MnSO4 + 2H2SO4',
  'KNO3|NaClO4': 'NaClO4 + KNO3 = KNO3 + NaClO4 (无反应)',
  'KOH|NH4Cl': 'NH4Cl + KOH = KCl + NH3 + H2O',
  'KOH|NH4NO3': 'NH4NO3 + KOH = KNO3 + NH3 + H2O',
  'KOH|P2O5': 'P₂O₅ + 6KOH = 2K₃PO₄ + 3H₂O',
  'KOH|SO2': 'SO₂ + 2KOH = K₂SO₃ + H₂O',
  'KOH|SO3': 'SO₃ + 2KOH = K₂SO₄ + H₂O',
  'Mg|N2': 'N2 + 3Mg = Mg3N2',
  'Mg|NH3': '2NH3 + 3Mg = Mg3N2 + 3H2',
  'Mg|O2': '2Mg + O₂ = 2MgO',
  'Mg|S': 'Mg + S = MgS',
  'Mg|SO2': '2Mg + SO2 = S + 2MgO',
  'Mg|ZnCl2': 'Mg + ZnCl₂ = MgCl₂ + Zn',
  'Mg|ZnSO4': 'Mg + ZnSO₄ = MgSO₄ + Zn',
  'MgCl2|NH3·H2O': '2NH3·H2O + MgCl2 = Mg(OH)2 + 2NH4Cl',
  'MgCl2|Na2CO3': 'MgCl2 + Na2CO3 = MgCO3 + 2NaCl',
  'MgCl2|Na2SiO3': 'Na2SiO3 + MgCl2 = MgSiO3 + 2NaCl',
  'MgCl2|Na3PO4': '2Na3PO4 + 3MgCl2 = Mg3(PO4)2 + 6NaCl',
  'MgCl2|NaOH': 'MgCl₂ + 2NaOH = Mg(OH)₂↓ + 2NaCl',
  'MgO|SO2': 'MgO + SO₂ = MgSO₃',
  'MgSO4|NH3·H2O': '2NH3·H2O + MgSO4 = Mg(OH)2 + (NH4)2SO4',
  'MgSO4|Na2CO3': 'Na2CO3 + MgSO4 = MgCO3 + Na2SO4',
  'Mn|O2': '2Mn + O2 = 2MnO',
  'Mn(NO3)2|NaOH': 'Mn(NO3)2 + 2NaOH = Mn(OH)2 + 2NaNO3',
  'Mn(OH)2|O2': '2Mn(OH)2 + O2 = 2MnO2 + 2H2O',
  'MnCl2|NH3·H2O': '2NH3·H2O + MnCl2 = Mn(OH)2 + 2NH4Cl',
  'MnCl2|Na2SiO3': 'Na2SiO3 + MnCl2 = MnSiO3 + 2NaCl',
  'MnCl2|NaOH': 'MnCl2 + 2NaOH = Mn(OH)2↓ + 2NaCl',
  'MnS|O2': '2MnS + 3O2 = 2MnO + 2SO2',
  'MnSO4|Na2CO3': 'MnSO4 + Na2CO3 = MnCO3↓ + Na2SO4',
  'MnSO4|NaOH': 'MnSO4 + 2NaOH = Mn(OH)2↓ + Na2SO4',
  'N2|O2': 'N₂ + O₂ = 2NO',
  'NH3|NH4HCO3': 'NH4HCO3 + NH3 = (NH4)2CO3',
  'NH3|NH4HSO4': 'NH4HSO4 + NH3 = (NH4)2SO4',
  'NH3|NO': '4NH3 + 6NO = 5N2 + 6H2O',
  'NH3|NO2': '8NH3 + 6NO2 = 7N2 + 12H2O',
  'NH3|Na': '2NH3 + 2Na = 2NaNH2 + H2',
  'NH3|NaBrO': '2NH3 + 3NaBrO = N2 + 3NaBr + 3H2O',
  'NH3|NaClO': '2NH3 + 3NaClO = N2 + 3NaCl + 3H2O',
  'NH3|NaHSO4': 'NH3 + NaHSO4 = NaNH4SO4',
  'NH3|O2': '4NH3 + 5O2 = 4NO + 6H2O',
  'NH3|O3': '2NH3 + 4O3 = NH4NO3 + 4O2 + H2O',
  'NH3·H2O|NH4HCO3': 'NH4HCO3 + NH3·H2O = (NH4)2CO3 + H2O',
  'NH3·H2O|NiCl2': '6NH3·H2O + NiCl2 = [Ni(NH3)6]Cl2 + 6H2O',
  'NH3·H2O|NiSO4': '6NH3·H2O + NiSO4 = [Ni(NH3)6]SO4 + 6H2O',
  'NH3·H2O|Pb(CH3COO)2': '2NH3·H2O + Pb(CH3COO)2 = Pb(OH)2 + 2CH3COONH4',
  'NH3·H2O|SO2': '2NH3·H2O + SO2 = (NH4)2SO3 + H2O',
  'NH3·H2O|SO3': '2NH3·H2O + SO3 = (NH4)2SO4 + H2O',
  'NH3·H2O|Zn(OH)2': '4NH3·H2O + Zn(OH)2 = [Zn(NH3)4](OH)2 + 4H2O',
  'NH3·H2O|ZnSO4': '4NH3·H2O + ZnSO4 = [Zn(NH3)4]SO4 + 4H2O',
  'NH4Cl|Na2CO3': '2NH4Cl + Na2CO3 = 2NaCl + CO2 + 2NH3 + H2O',
  'NH4Cl|NaClO4': 'NaClO4 + NH4Cl = NH4ClO4 + NaCl',
  'NH4Cl|NaHSO4': 'NH4Cl + NaHSO4 = NaCl + NH4HSO4',
  'NH4Cl|NaNO2': 'NaNO2 + NH4Cl = NaCl + N2 + 2H2O',
  'NH4Cl|NaOH': 'NH₄Cl + NaOH = NaCl + NH₃↑ + H₂O',
  'NH4NO3|NaOH': 'NH₄NO₃ + NaOH = NaNO₃ + NH₃↑ + H₂O',
  'NO|O2': '2NO + O₂ = 2NO₂',
  'NO2|NaOH': '2NO₂ + 2NaOH = NaNO₂ + NaNO₃ + H₂O',
  'Na|O2': '2Na + O₂ = Na₂O₂',
  'Na|S': '2Na + S = Na₂S',
  'Na2CO3|SiO2': 'SiO2 + Na2CO3 = Na2SiO3 + CO2',
  'Na2CO3|SrCl2': 'Na2CO3 + SrCl2 = SrCO3 + 2NaCl',
  'Na2CO3|ZnSO4': 'ZnSO4 + Na2CO3 = ZnCO3 + Na2SO4',
  'Na2HPO4|NaOH': 'Na2HPO4 + NaOH = Na3PO4 + H2O',
  'Na2O|SO2': 'Na₂O + SO₂ = Na₂SO₃',
  'Na2O2|SO2': 'Na₂O₂ + SO₂ = Na₂SO₄',
  'Na2S|O2': '2Na2S + O2 + 2H2O = 4NaOH + 2S',
  'Na2S|Pb(NO3)2': 'Pb(NO3)2 + Na2S = PbS + 2NaNO3',
  'Na2S|ZnSO4': 'Na2S + ZnSO4 = ZnS + Na2SO4',
  'Na2SO3|O2': '2Na2SO3 + O2 = 2Na2SO4',
  'Na2SO3|S': 'Na₂SO₃ + S = Na₂S₂O₃',
  'Na2SiO3|NiSO4': 'Na2SiO3 + NiSO4 = NiSiO3 + Na2SO4',
  'Na2SiO3|Pb(NO3)2': 'Na2SiO3 + Pb(NO3)2 = PbSiO3 + 2NaNO3',
  'Na2SiO3|ZnSO4': 'Na2SiO3 + ZnSO4 = ZnSiO3 + Na2SO4',
  'NaClO|Pb(OH)2': 'NaClO + Pb(OH)2 = PbO2 + NaCl + H2O',
  'NaH2PO4|NaOH': 'NaH2PO4 + 2NaOH = Na3PO4 + 2H2O',
  'NaHCO3|NaOH': 'NaHCO3 + NaOH = Na2CO3 + H2O',
  'NaHCO3|SO2': 'SO2 + 2NaHCO3 = Na2SO3 + 2CO2 + H2O',
  'NaHSO3|NaIO3': '2NaIO3 + 5NaHSO3 = 3NaHSO4 + 2Na2SO4 + I2 + H2O',
  'NaOH|P2O5': 'P₂O₅ + 6NaOH = 2Na₃PO₄ + 3H₂O',
  'NaOH|Pb(OH)2': 'Pb(OH)2 + 2NaOH = Na2[Pb(OH)4]',
  'NaOH|S': '3S + 6NaOH = 2Na₂S + Na₂SO₃ + 3H₂O',
  'NaOH|SO2': 'SO₂ + 2NaOH = Na₂SO₃ + H₂O',
  'NaOH|SO3': 'SO₃ + 2NaOH = Na₂SO₄ + H₂O',
  'NaOH|Si': 'Si + 2NaOH + H2O = Na2SiO3 + 2H2',
  'NaOH|SiO2': 'SiO2 + 2NaOH = Na2SiO3 + H2O',
  'NaOH|Zn(OH)2': 'Zn(OH)2 + 2NaOH = Na2[Zn(OH)4]',
  'NaOH|ZnSO4': '2NaOH + ZnSO4 = Zn(OH)2 + Na2SO4',
  'O2|P': '4P + 5O₂ = 2P₂O₅',
  'O2|PH3': '2PH3 + 4O2 = P2O5 + 3H2O',
  'O2|PbS': '2PbS + 3O2 = 2PbO + 2SO2',
  'O2|S': 'S + O₂ = SO₂',
  'O2|SO2': '2SO₂ + O₂ = 2SO₃',
  'O2|Si': 'Si + O₂ = SiO₂',
  'O2|SiH4': 'SiH4 + 2O2 = SiO2 + 2H2O',
  'O2|Zn': '2Zn + O₂ = 2ZnO',
  'P|S': '2P + 5S = P₂S₅',
  'S|Zn': 'Zn + S = ZnS',
}
const OFFLINE_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

const defaultAnnouncements = [{ id: 1, title: 'Offline Mode', content: 'Running fully offline with local data only.', type: 'info', is_ticker: false, is_persistent: true }]
const hints = [
  { id: 1, content: 'Offline mode is active. Everything stays on this device.' },
  { id: 2, content: 'Use AI Arena in the lobby for quick local matches.' },
  { id: 3, content: 'This build runs entirely in the frontend.' }
]

const buildDefaultSubstances = () => Object.keys(substanceNames).map((formula, index) => ({
  id: index + 1,
  formula,
  name: substanceNames[formula],
  elements: formula,
  status: 'approved',
  group_id: null,
  needs_improvement: false,
  has_invalid_elements: false,
  creator_uid: 0,
  creator_name: 'offline',
  created_at: nowISO(),
}))

const buildDefaultReactions = () => Object.entries(reactionPairs).map(([pair, formula], index) => {
  const [r1, r2] = pair.split('|')
  return {
    id: index + 1,
    r1,
    r2,
    display: formula,
    status: 'approved',
    creator_uid: 0,
    creator_name: 'offline',
    has_invalid_elements: false,
    created_at: nowISO(),
  }
})

const defaultLevelConfigs = {
  level_step_exp: 100,
  level_cap: 100,
  offline_mode: true,
}

const buildSessionContext = (): Omit<RuntimeSessionMetadata, 'id' | 'uid' | 'created_at' | 'last_active' | 'expires_at' | 'revoked_at'> => ({
  user_agent: navigator.userAgent || 'offline-runtime',
  ip: '127.0.0.1',
  host: getClientRuntimeHost(),
  mode: 'offline',
})

const isTrustedLocalHost = (host: ReturnType<typeof getClientRuntimeHost>) => host === 'electron' || host === 'capacitor'

const isSecuritySensitivePath = (path: string) => (
  path === '/auth/send-code' ||
  path === '/auth/reset-password' ||
  path === '/auth/2fa/verify' ||
  path === '/auth/2fa/reset-password' ||
  path.startsWith('/auth/webauthn/') ||
  path.startsWith('/user/2fa/') ||
  path.startsWith('/user/webauthn/') ||
  path === '/user/change-email' ||
  path === '/user/set-email'
)

const buildSecurityGateResponse = (path: string) => {
  const host = getClientRuntimeHost()
  const trusted = isTrustedLocalHost(host)
  const trustLevel = trusted ? 'trusted-local-host' : 'browser-untrusted'

  if (!trusted) {
    return {
      status: 403,
      data: {
        error: 'This security-sensitive flow is blocked in browser-only offline mode. Use a trusted host runtime.',
        code: 'OFFLINE_TRUST_REQUIRED',
        path,
        host,
        trust_level: trustLevel,
      },
    }
  }

  return {
    status: 501,
    data: {
      error: 'This security-sensitive flow requires host security bridges that are not wired in the current local runtime.',
      code: 'HOST_SECURITY_BRIDGE_UNAVAILABLE',
      path,
      host,
      trust_level: trustLevel,
    },
  }
}

const nextNumericId = (items: Array<{ id?: number | string }>) => {
  return items.reduce((maxId, item) => {
    const id = Number(item.id)
    if (!Number.isFinite(id)) return maxId
    return Math.max(maxId, id)
  }, 0) + 1
}

const parseBooleanQueryValue = (value: string | undefined) => {
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  return null
}

const readRuntimeReactions = () => reactionRepository.read(buildDefaultReactions())
const writeRuntimeReactions = (records: Array<Record<string, any>>) => {
  const next = reactionRepository.write(records)
  runtimeIndexesReady = false
  rebuildRuntimeIndexes()
  return next
}

const readRuntimeSubstances = () => substanceRepository.read(buildDefaultSubstances())
const writeRuntimeSubstances = (records: Array<Record<string, any>>) => {
  const next = substanceRepository.write(records)
  runtimeIndexesReady = false
  rebuildRuntimeIndexes()
  return next
}

const paginateRecords = <T>(items: T[], page: number, pageSize: number) => {
  const normalizedPage = Math.max(1, page)
  const normalizedPageSize = Math.max(1, pageSize)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize))
  const safePage = Math.min(normalizedPage, totalPages)
  const offset = (safePage - 1) * normalizedPageSize
  return {
    items: items.slice(offset, offset + normalizedPageSize),
    pagination: {
      page: safePage,
      page_size: normalizedPageSize,
      total,
      total_pages: totalPages,
    }
  }
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const nowISO = () => new Date().toISOString()
const nowMs = () => Date.now()
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const makeLocalPlayer = (nickname = '本地玩家', avatar = 'flask'): User => ({
  uid: 1,
  username: 'local-player',
  password: '',
  nickname,
  avatar,
  role: 'user',
  is_admin: false,
  points: 0,
  exp: 0,
  level: 1,
  created_at: nowISO(),
  sound_volume: 0.8,
  vibration_enabled: true,
  enable_element_input: false,
  custom_contact: 'offline://local',
  bio: 'Local single-player profile'
})

const makeInitialState = (): State => ({
  users: [makeLocalPlayer()],
  session_uid: null,
  next_uid: 2,
  next_deck_id: 2,
  next_history_id: 1,
  next_feedback_id: 1,
  decks: [{
    id: 1,
    name: 'Offline Default Deck',
    is_global: true,
    cards: clone(builtinDeck),
    initial_cards: 10,
    created_by: 1,
    created_at: nowISO()
  }],
  rooms: [],
  histories: [],
  feedbacks: [],
  friends: [],
  global_messages: [{
    user_uid: 0,
    username: 'system',
    nickname: 'Offline Lab',
    avatar: '🧪',
    message: 'Offline mode is ready. No server connection is required.',
    created_at: nowISO()
  }]
})

const readState = (): State => {
  const seeded = makeInitialState()
  const parsed = stateRepository.read(seeded) as Partial<State>
  return {
    ...seeded,
    ...parsed,
    rooms: parsed.rooms || [],
    histories: parsed.histories || [],
    feedbacks: parsed.feedbacks || [],
    friends: parsed.friends || [],
    decks: parsed.decks || seeded.decks,
    users: parsed.users || seeded.users,
    global_messages: parsed.global_messages || seeded.global_messages
  }
}

const writeState = (state: State) => stateRepository.write(state)
const resetOfflineState = () => {
  turnTimers.forEach((timer) => clearTimeout(timer))
  aiTimers.forEach((timer) => clearTimeout(timer))
  turnTimers.clear()
  aiTimers.clear()
  runtimeSqlite.clear()
  runtimeIndexesReady = false

  // Clear all known storage keys for a truly fresh start
  const keysToRemove = [
    STORAGE_KEY,
    CLIENT_RUNTIME_STORAGE_KEYS.user,
    CLIENT_RUNTIME_STORAGE_KEYS.token,
    CLIENT_RUNTIME_STORAGE_KEYS.accessToken,
    CLIENT_RUNTIME_STORAGE_KEYS.refreshToken,
    CLIENT_RUNTIME_STORAGE_KEYS.theme,
  ]
  removeClientRuntimeKeys(keysToRemove)

  for (let i = 0; i < clientRuntimeStorage.length; i++) {
    const key = clientRuntimeStorage.key(i)
    if (key && key.startsWith('chemistry-uno-')) {
      clientRuntimeStorage.removeItem(key)
      i -= 1
    }
  }

  updateStoredUser(null)
  const initialState = makeInitialState()
  writeState(initialState)
  return initialState
}
const currentUser = (state: State) => userRepository.current(state)

const ensureCurrentSession = (user: User) => {
  sessionRepository.pruneExpired(nowMs())
  const currentSessionId = sessionRepository.getCurrentSessionId()
  if (!currentSessionId) {
    return true
  }

  const activeSessions = sessionRepository.listActive(user.uid)
  const current = activeSessions.find((session) => session.id === currentSessionId)
  if (!current) {
    return false
  }

  sessionRepository.touch(currentSessionId, nowISO(), user.uid)
  return true
}

const requireAuth = (state: State) => {
  const user = currentUser(state)
  if (!user) throw { status: 401, data: { error: 'Not logged in' } }
  if (!ensureCurrentSession(user)) {
    state.session_uid = null
    sessionRepository.clearStoredTokens()
    throw { status: 401, data: { error: 'Session expired' } }
  }
  return user
}

const getUserRole = (user: User) => String(user.role || 'user').toLowerCase()

const isAdminUser = (user: User) => Boolean(user.is_admin || getUserRole(user) === 'admin')

const canModerate = (user: User) => isAdminUser(user) || getUserRole(user) === 'co_worker'

const requireCapability = (state: State, scope: 'moderate' | 'admin') => {
  const user = requireAuth(state)
  const allowed = scope === 'admin' ? isAdminUser(user) : canModerate(user)
  if (!allowed) {
    const host = getClientRuntimeHost()
    throw {
      status: 403,
      data: {
        error: 'This privileged operation is gated by local role capabilities and trust assumptions in frontend-only mode.',
        code: 'LOCAL_CAPABILITY_REQUIRED',
        required_scope: scope,
        host,
        trust_notice: 'Privileged flows in frontend-only runtime are advisory gates, not server-enforced isolation.',
      }
    }
  }
  return user
}

const emit = (type: string, data: any) => eventBus.dispatchEvent(new CustomEvent(type, { detail: data }))
const clearTimer = (map: Map<string, number>, roomId: string) => {
  const timer = map.get(roomId)
  if (timer) {
    clearTimeout(timer)
    map.delete(roomId)
  }
}

const randomId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`
const unique = <T>(items: T[]) => Array.from(new Set(items))
const normalizeFormula = (value: string) => String(value || '').replace(/\s+/g, '')
let reactionEquationByPair = new Map<string, string>()
let substanceNameByFormula = new Map<string, string>()
let allKnownFormulas: string[] = []
let runtimeIndexesReady = false
const getReactionPairKey = (a: string, b: string) => {
  const left = normalizeFormula(a)
  const right = normalizeFormula(b)
  if (!left || !right) return ''
  return [left, right].sort().join('|')
}
const getReactionEquation = (a: string, b: string) => {
  const pair = getReactionPairKey(a, b)
  if (!pair) return null

  const cached = reactionEquationByPair.get(pair)
  if (cached) return cached

  const [left, right] = pair.split('|')
  const equation = runtimeSqlite.findReactionEquation(left || '', right || '')
  if (equation) {
    reactionEquationByPair.set(pair, equation)
    return equation
  }

  return null
}
const randomIntBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const parsedFormulaCache = new Map<string, Record<string, number>>()
const aiReactionTargetsByFormula = new Map<string, string[]>()
const aiFormulaCandidatesByCard = new Map<string, string[]>()

const parseFormula = (formula: string): Record<string, number> => {
  const input = normalizeFormula(formula)
  const cached = parsedFormulaCache.get(input)
  if (cached) return cached
  const stack: Array<Record<string, number>> = [{}]
  let i = 0

  const addElement = (target: Record<string, number>, key: string, count: number) => {
    target[key] = (target[key] || 0) + count
  }

  while (i < input.length) {
    const char = input[i]
    if (char === '(') {
      stack.push({})
      i += 1
      continue
    }
    if (char === ')') {
      i += 1
      let digits = ''
      while (i < input.length && /\d/.test(input[i])) {
        digits += input[i]
        i += 1
      }
      const multiplier = digits ? Number(digits) : 1
      const group = stack.pop() || {}
      const parent = stack[stack.length - 1]
      Object.entries(group).forEach(([key, value]) => addElement(parent, key, value * multiplier))
      continue
    }
    if (/[A-Z]/.test(char)) {
      let symbol = char
      i += 1
      while (i < input.length && /[a-z]/.test(input[i])) {
        symbol += input[i]
        i += 1
      }
      let digits = ''
      while (i < input.length && /\d/.test(input[i])) {
        digits += input[i]
        i += 1
      }
      addElement(stack[stack.length - 1], symbol, digits ? Number(digits) : 1)
      continue
    }
    i += 1
  }

  const parsed = stack[0]
  if (Object.keys(parsed).length === 0 && input) {
    parsed[input] = 1
  }
  parsedFormulaCache.set(input, parsed)
  return parsed
}

const rebuildRuntimeIndexes = () => {
  readRuntimeSubstances()
  readRuntimeReactions()

  const names = runtimeSqlite.listSubstanceNames()
  substanceNameByFormula = new Map(Object.entries(names))
  reactionEquationByPair = new Map(
    runtimeSqlite
      .listReactionPairs()
      .map((reaction) => [getReactionPairKey(reaction.r1, reaction.r2), reaction.display] as const)
      .filter(([pair]) => Boolean(pair)),
  )
  allKnownFormulas = unique([...runtimeSqlite.listApprovedSubstanceFormulas(), ...Object.keys(builtinDeck)])
  aiReactionTargetsByFormula.clear()
  aiFormulaCandidatesByCard.clear()

  allKnownFormulas.forEach((formula) => {
    const normalized = normalizeFormula(formula)
    const keys = specialCards.has(normalized) ? [normalized] : Object.keys(parseFormula(normalized))
    keys.forEach((key) => {
      const bucket = aiFormulaCandidatesByCard.get(key) || []
      if (!bucket.includes(normalized)) bucket.push(normalized)
      aiFormulaCandidatesByCard.set(key, bucket)
    })
  })

  reactionEquationByPair.forEach((_equation, pair) => {
    const [left, right] = pair.split('|').map((value) => normalizeFormula(value))
    if (!left || !right) return
    const leftBucket = aiReactionTargetsByFormula.get(left) || []
    if (!leftBucket.includes(right)) leftBucket.push(right)
    aiReactionTargetsByFormula.set(left, leftBucket)

    const rightBucket = aiReactionTargetsByFormula.get(right) || []
    if (!rightBucket.includes(left)) rightBucket.push(left)
    aiReactionTargetsByFormula.set(right, rightBucket)
  })

  runtimeIndexesReady = true
}

export const ensureLocalRuntimeReady = async () => {
  await ensureClientRuntimeDatabase()
  if (!runtimeIndexesReady) {
    rebuildRuntimeIndexes()
  }
}

const getCardCounts = (cards: Card[]) => {
  const result: Record<string, number> = {}
  cards.forEach((card) => {
    result[card.type] = (result[card.type] || 0) + 1
  })
  return result
}

const canFormSubstanceFromCounts = (counts: Record<string, number>, substance: string) => {
  if (specialCards.has(substance)) {
    return (counts[substance] || 0) > 0
  }
  const need = parseFormula(substance)
  return Object.entries(need).every(([key, value]) => (counts[key] || 0) >= value)
}

const canFormSubstance = (cards: Card[], substance: string) => canFormSubstanceFromCounts(getCardCounts(cards), substance)

const removeFormulaCards = (cards: Card[], substance: string) => {
  const next = [...cards]
  if (specialCards.has(substance)) {
    const index = next.findIndex((card) => card.type === substance)
    if (index >= 0) next.splice(index, 1)
    return next
  }
  const need = parseFormula(substance)
  Object.entries(need).forEach(([symbol, count]) => {
    let remaining = count
    for (let i = next.length - 1; i >= 0 && remaining > 0; i -= 1) {
      if (next[i].type === symbol) {
        next.splice(i, 1)
        remaining -= 1
      }
    }
  })
  return next
}

const isReactionPair = (a: string, b: string) => {
  const left = normalizeFormula(a)
  const right = normalizeFormula(b)
  if (!left || !right) return false
  if (specialCards.has(left) || specialCards.has(right)) return true
  return !!getReactionEquation(left, right)
}

const getAvailableSubstances = (cards: Card[]) => {
  const counts = getCardCounts(cards)
  return allKnownFormulas.filter((formula) => canFormSubstanceFromCounts(counts, formula))
}

const getAiPlayableSubstances = (cards: Card[], lastCardSubstance?: string | null) => {
  const counts = getCardCounts(cards)
  const normalizedLastCard = normalizeFormula(lastCardSubstance || '')
  const candidateSet = new Set<string>()

  if (normalizedLastCard) {
    ;(aiReactionTargetsByFormula.get(normalizedLastCard) || []).forEach((formula) => candidateSet.add(formula))
    specialCards.forEach((formula) => candidateSet.add(formula))
  } else {
    Object.keys(counts).forEach((cardType) => {
      ;(aiFormulaCandidatesByCard.get(cardType) || []).forEach((formula) => candidateSet.add(formula))
    })
  }

  return Array.from(candidateSet).filter((formula) => canFormSubstanceFromCounts(counts, formula))
}

const serializeUser = (user: User) => {
  const serialized = { ...user, id: user.uid } as Record<string, any>
  delete serialized.password
  return serialized
}
const getPlayerInfo = (state: State, uid: number) => state.users.find((user) => user.uid === uid)
const ensureRoom = (state: State, roomId: string) => {
  const room = state.rooms.find((item) => item.id === roomId)
  if (!room) throw { status: 404, data: { error: 'Room not found' } }
  return room
}
const ensureGame = (room: Room) => {
  if (!room.game_state) throw { status: 400, data: { error: 'Game not started' } }
  return room.game_state
}

const toPlayerState = (user: User | { uid: number; username: string; nickname: string; avatar: string }, isReady: boolean, isAi = false): PlayerState => ({
  uid: user.uid,
  username: user.username,
  nickname: user.nickname || user.username,
  avatar: user.avatar || '🧪',
  hand_cards: [],
  card_count: 0,
  is_ready: isReady,
  double_action_available: false,
  action_progress: 0,
  is_ai: isAi
})

const createCard = (type: string): Card => ({ type, count: 1, effect: specialCards.has(type) ? type : undefined })

const buildDrawPile = (deck: Deck) => {
  const pile: Card[] = []
  Object.entries(deck.cards).forEach(([type, count]) => {
    for (let i = 0; i < count; i += 1) {
      pile.push(createCard(type))
    }
  })
  for (let i = pile.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = pile[i]
    pile[i] = pile[j]
    pile[j] = tmp
  }
  return pile
}

const findPlayerIndexByUid = (game: GameState, uid: number) => game.players.findIndex((player) => player.uid === uid)
const refreshCardCounts = (game: GameState) => {
  game.players.forEach((player) => {
    player.card_count = player.hand_cards.length
  })
}

const isTutorialScriptEnabled = (room: Room) => Boolean(room.tutorial_script && room.game_state?.tutorial_script_mode)

const getCurrentTutorialStep = (game: GameState): TutorialStep | undefined => {
  if (!game.tutorial_script_mode || game.tutorial_current_step <= 0) return undefined
  return getTutorialStep(game.tutorial_current_step)
}

const advanceTutorialStep = (game: GameState) => {
  if (!game.tutorial_script_mode) return
  game.tutorial_current_step += 1
}

const drawCardsForPlayer = (game: GameState, index: number, count: number) => {
  const player = game.players[index]
  for (let i = 0; i < count; i += 1) {
    const drawn = game.draw_pile.shift()
    if (!drawn) break
    player.hand_cards.push(drawn)
  }
  refreshCardCounts(game)
}

const nextActivePlayerIndex = (game: GameState) => {
  if (game.players.length <= 1) return 0
  let next = game.current_player
  for (let i = 0; i < game.players.length; i += 1) {
    next = (next + game.direction + game.players.length) % game.players.length
    const uid = game.players[next]?.uid
    if (!game.finished_players.includes(uid)) return next
  }
  return next
}

const maybeAdvanceTutorialForHumanAction = (room: Room, playerIndex: number, action: TutorialStep['action'], substance?: string) => {
  if (!isTutorialScriptEnabled(room)) return
  const game = ensureGame(room)
  const currentStep = getCurrentTutorialStep(game)
  const player = game.players[playerIndex]
  if (!currentStep || currentStep.player !== 'human' || player?.is_ai) return
  if (currentStep.action !== action) return

  const normalizedSubstance = normalizeFormula(substance || '')
  const expectedSubstance = normalizeFormula(currentStep.substance || '')
  if (action === 'play' && expectedSubstance && normalizedSubstance !== expectedSubstance) return

  advanceTutorialStep(game)
}

const maybeAdvanceTutorialForAiAction = (room: Room) => {
  if (!isTutorialScriptEnabled(room)) return
  const game = ensureGame(room)
  const currentStep = getCurrentTutorialStep(game)
  if (!currentStep || currentStep.player !== 'ai') return
  advanceTutorialStep(game)
}

const runTutorialAiTurn = (state: State, room: Room) => {
  const game = ensureGame(room)
  const currentStep = getCurrentTutorialStep(game)
  const player = game.players[game.current_player]
  if (!player?.is_ai || !currentStep || currentStep.player !== 'ai') return false

  if (currentStep.action === 'draw') {
    const drawCount = Math.max(1, game.pending_draw_count || 1)
    drawCardsForPlayer(game, game.current_player, drawCount)
    game.pending_draw_count = 0
    game.pending_draw_types = []
    maybeAdvanceTutorialForAiAction(room)
    emit('action_toast', { type: 'action_toast', data: currentStep.aiMessage || `${player.nickname} drew cards.` })
    advanceTurn(state, room)
    return true
  }

  if (currentStep.action === 'play' && currentStep.substance) {
    const scriptedSubstance = normalizeFormula(currentStep.substance)
    if (!canFormSubstance(player.hand_cards, scriptedSubstance)) {
      throw { status: 400, data: { error: `Tutorial AI is missing required cards for ${scriptedSubstance}` } }
    }
    if (game.last_card && !isReactionPair(game.last_card.substance, scriptedSubstance)) {
      throw { status: 400, data: { error: `Tutorial AI cannot legally play ${scriptedSubstance} after ${game.last_card.substance}` } }
    }
    applyPlay(
      state,
      room,
      game.current_player,
      scriptedSubstance,
      game.last_card ? [game.last_card.substance, scriptedSubstance] : [scriptedSubstance],
    )
    maybeAdvanceTutorialForAiAction(room)
    emit('action_toast', { type: 'action_toast', data: currentStep.aiMessage || `${player.nickname} played ${scriptedSubstance}.` })
    advanceTurn(state, room)
    return true
  }

  return false
}

const getPlayerSummary = (state: State, room: Room) => room.players.map((uid) => serializeUser(getPlayerInfo(state, uid) || {
  uid,
  username: `player-${uid}`,
  password: '',
  nickname: `Player ${uid}`,
  avatar: '🧪',
  role: 'user',
  is_admin: false,
  points: 1000,
  exp: 0,
  level: 1,
  created_at: nowISO()
}))

const roomSnapshot = (state: State, room: Room) => ({
  ...clone(room),
  players_info: getPlayerSummary(state, room)
})

const emitRoomsUpdate = (state: State) => {
  emit('rooms_update', { type: 'rooms_update', data: clone(state.rooms) })
  emit('online_count', { type: 'online_count', data: Math.max(1, state.users.length) })
}

const emitGameUpdate = (room: Room) => {
  if (room.game_state) {
    emit('game_update', { type: 'game_update', data: clone(room.game_state) })
  }
}

const pushGlobalChat = (state: State, message: ChatMessage) => {
  state.global_messages.push(message)
  state.global_messages = state.global_messages.slice(-100)
}

const createHistory = (state: State, room: Room) => {
  const game = room.game_state
  if (!game) return
  const winnerUid = game.finished_players[0] ?? null
  const winner = winnerUid ? getPlayerInfo(state, winnerUid) : null
  state.histories.unshift({
    id: state.next_history_id++,
    room_id: room.id,
    winner_uid: winnerUid,
    winner_name: winner?.nickname || winner?.username || 'Unknown',
    is_invalid: false,
    invalid_reason: '',
    has_replay: true,
    replay_events: clone(game.discard_pile),
    replay_permanent: true,
    replay_expires_at: null,
    replay_cleared_at: null,
    cheat_detected: false,
    cheat_uids: [],
    players: clone(room.players),
    original_player_count: game.original_player_count,
    quitted_count: game.quitted_count,
    finished_players: clone(game.finished_players),
    started_at: room.created_at,
    finished_at: nowISO(),
    created_at: nowISO()
  })
}

const finishGameIfNeeded = (state: State, room: Room) => {
  const game = room.game_state
  if (!game || game.status === 'finished') return
  const alive = game.players.filter((player) => !game.finished_players.includes(player.uid))
  if (alive.length <= 1) {
    if (alive.length === 1 && !game.finished_players.includes(alive[0].uid)) {
      game.finished_players.unshift(alive[0].uid)
    }
    game.status = 'finished'
    room.status = 'finished'
    const winnerUid = game.finished_players[0]
    game.points_changes = {}
    game.xp_changes = {}
    game.players.forEach((player, index) => {
      const won = player.uid === winnerUid || (index === 0 && !winnerUid)
      game.points_changes[player.uid] = won ? 30 : 10
      game.xp_changes[player.uid] = won ? 20 : 8
      const user = getPlayerInfo(state, player.uid)
      if (user) {
        user.points += game.points_changes[player.uid]
        user.exp += game.xp_changes[player.uid]
        user.level = Math.max(1, Math.floor(user.exp / 100) + 1)
      }
    })
    clearTimer(turnTimers, room.id)
    clearTimer(aiTimers, room.id)
    createHistory(state, room)
    emit('action_toast', { type: 'action_toast', data: 'Game finished in offline mode.' })
    emitGameUpdate(room)
    emitRoomsUpdate(state)
  }
}

const runAiTurn = (state: State, room: Room) => {
  const game = ensureGame(room)
  const player = game.players[game.current_player]
  if (!player?.is_ai) return
  if (isTutorialScriptEnabled(room)) {
    const currentStep = getCurrentTutorialStep(game)
    if (currentStep?.player === 'ai') {
      runTutorialAiTurn(state, room)
      return
    }
  }
  const playable = getAiPlayableSubstances(player.hand_cards, game.last_card?.substance)
  if (playable.length > 0) {
    applyPlay(state, room, game.current_player, playable[0], game.last_card ? [game.last_card.substance, playable[0]] : [playable[0]])
    emit('action_toast', { type: 'action_toast', data: `${player.nickname} played ${playable[0]}.` })
  } else {
    const drawCount = Math.max(1, game.pending_draw_count || 1)
    drawCardsForPlayer(game, game.current_player, drawCount)
    game.pending_draw_count = 0
    game.pending_draw_types = []
    emit('action_toast', { type: 'action_toast', data: `${player.nickname} drew cards.` })
  }
  advanceTurn(state, room)
}

const maybeScheduleAiTurn = (_state: State, room: Room) => {
  clearTimer(aiTimers, room.id)
  const game = room.game_state
  if (!game || game.status !== 'playing') return
  const current = game.players[game.current_player]
  if (!current?.is_ai) return
  const timer = window.setTimeout(() => {
    const latest = readState()
    const targetRoom = latest.rooms.find((item) => item.id === room.id)
    if (!targetRoom?.game_state || targetRoom.game_state.status !== 'playing') return
    runAiTurn(latest, targetRoom)
    writeState(latest)
    emitGameUpdate(targetRoom)
    emitRoomsUpdate(latest)
  }, randomIntBetween(AI_TURN_DELAY_MIN_MS, AI_TURN_DELAY_MAX_MS))
  aiTimers.set(room.id, timer)
}

const scheduleTurnTimer = (_state: State, room: Room) => {
  clearTimer(turnTimers, room.id)
  const game = room.game_state
  if (!game || game.status !== 'playing') return
  if (isTutorialScriptEnabled(room)) {
    game.turn_end_time = 0
    return
  }
  game.turn_end_time = nowMs() + TURN_TIMEOUT_MS
  const current = game.players[game.current_player]
  const timer = window.setTimeout(() => {
    const latest = readState()
    const targetRoom = latest.rooms.find((item) => item.id === room.id)
    if (!targetRoom?.game_state || targetRoom.game_state.status !== 'playing') return
    const player = targetRoom.game_state.players[targetRoom.game_state.current_player]
    if (!player || player.uid !== current.uid) return
    drawCardsForPlayer(targetRoom.game_state, targetRoom.game_state.current_player, Math.max(1, targetRoom.game_state.pending_draw_count || 1))
    targetRoom.game_state.pending_draw_count = 0
    targetRoom.game_state.pending_draw_types = []
    targetRoom.game_state.current_player = nextActivePlayerIndex(targetRoom.game_state)
    writeState(latest)
    emit('action_toast', { type: 'action_toast', data: `${player.nickname} auto-drew due to timeout.` })
    emitGameUpdate(targetRoom)
    emitRoomsUpdate(latest)
    scheduleTurnTimer(latest, targetRoom)
    maybeScheduleAiTurn(latest, targetRoom)
  }, TURN_TIMEOUT_MS)
  turnTimers.set(room.id, timer)
}

const appendFinishedPlayer = (game: GameState, uid: number) => {
  if (!game.finished_players.includes(uid)) {
    game.finished_players.push(uid)
  }
}

const applyPlay = (_state: State, room: Room, playerIndex: number, substance: string, reactants?: string[]) => {
  const game = ensureGame(room)
  const player = game.players[playerIndex]
  const normalized = normalizeFormula(substance)
  const isFreeDeployTurn = game.allowed_any_player === playerIndex
  if (!normalized) throw { status: 400, data: { error: 'Substance is required' } }
  if (!canFormSubstance(player.hand_cards, normalized)) {
    throw { status: 400, data: { error: 'Required cards are not available locally' } }
  }
  if (game.last_card && !isFreeDeployTurn && !isReactionPair(game.last_card.substance, normalized)) {
    throw { status: 400, data: { error: 'These substances cannot react' } }
  }

  player.hand_cards = removeFormulaCards(player.hand_cards, normalized)
  player.card_count = player.hand_cards.length
  player.action_progress = Math.min(2, player.action_progress + 1)
  if (player.action_progress >= 2) {
    player.double_action_available = true
  }

  const isSpecial = specialCards.has(normalized)
  const playedCard: PlayedCard = {
    card: { type: normalized, count: 1, effect: isSpecial ? normalized : undefined },
    substance: normalized,
    player_uid: player.uid,
    reactants
  }

  game.discard_pile.push(playedCard)
  game.allowed_any_player = -1

  if (normalized === 'Au') {
    const skippedPlayerIndex = nextActivePlayerIndex(game)
    game.last_card = null
    game.current_reaction = ''
    game.allowed_any_player = skippedPlayerIndex
    game.last_effect_type = 'ban'
    game.effect_target_uid = game.players[skippedPlayerIndex]?.uid ?? null
  } else if (['He', 'Ne', 'Ar', 'Kr'].includes(normalized)) {
    game.last_effect_type = 'reverse'
    game.effect_target_uid = null
  } else {
    game.last_card = playedCard
    const fullReaction = reactants?.length === 2 ? getReactionEquation(reactants[0], reactants[1]) : null
    game.current_reaction = fullReaction || normalized
    game.last_effect_type = ''
    game.effect_target_uid = null
  }

  if (normalized === '+2') {
    game.pending_draw_count += 2
    game.pending_draw_types.push('+2')
  }
  if (normalized === '+4') {
    game.pending_draw_count += 4
    game.pending_draw_types.push('+4')
  }

  if (['He', 'Ne', 'Ar', 'Kr'].includes(normalized)) {
    game.direction *= -1
  }

  if (player.hand_cards.length === 0) {
    appendFinishedPlayer(game, player.uid)
  }

  if (isSpecial) {
    const effectText = normalized === '+2' ? '摸 2 张牌' : (normalized === '+4' ? '摸 4 张牌' : (normalized === 'Au' ? '清空场上手牌，下一位任意出牌' : '反转出牌顺序'))
    emit('action_toast', { type: 'action_toast', data: `${player.nickname} 使用了 ${normalized} (${effectText})` })
  }
}

const advanceTurn = (state: State, room: Room) => {
  const game = ensureGame(room)
  refreshCardCounts(game)
  finishGameIfNeeded(state, room)
  if (game.status === 'finished') return
  game.current_player = nextActivePlayerIndex(game)
  scheduleTurnTimer(state, room)
  maybeScheduleAiTurn(state, room)
}

const buildGameState = (state: State, room: Room) => {
  const players = room.players.map((uid) => {
    const user = getPlayerInfo(state, uid)
    if (!user) throw { status: 400, data: { error: 'User not found in room' } }
    return toPlayerState(user, room.ready_uids.includes(uid))
  })

  for (let i = 0; i < room.ai_count; i += 1) {
    const uid = -1 - i
    players.push(toPlayerState({
      uid,
      username: `ai-${Math.abs(uid)}`,
      nickname: aiNames[i % aiNames.length],
      avatar: '🤖'
    }, true, true))
  }

  const deck = buildDrawPile(room.deck_config)
  const initialCards = room.deck_config.initial_cards || 10
  const game: GameState = {
    room_id: room.id,
    players,
    spectators: clone(room.spectators),
    finished_players: [],
    current_player: 0,
    direction: 1,
    last_card: null,
    discard_pile: [],
    original_player_count: players.length,
    quitted_count: 0,
    status: 'playing',
    is_points_mode: room.is_points_mode,
    turn_end_time: 0,
    pending_draw_count: 0,
    pending_draw_types: [],
    allowed_any_player: -1,
    points_changes: {},
    xp_changes: {},
    current_reaction: '',
    last_effect_type: '',
    effect_target_uid: null,
    tutorial_script_mode: room.tutorial_script,
    tutorial_current_step: room.tutorial_script ? 1 : 0,
    pending_forced_plays: 0,
    draw_pile: deck
  }

  if (room.tutorial_script && game.players.length >= 2) {
    game.players[0].hand_cards = TUTORIAL_INITIAL_STATE.humanHand.map(createCard)
    game.players[1].hand_cards = TUTORIAL_INITIAL_STATE.aiHand.map(createCard)
    game.last_card = {
      card: createCard(TUTORIAL_INITIAL_STATE.discardTop),
      substance: TUTORIAL_INITIAL_STATE.discardTop,
      player_uid: 0,
      reactants: [TUTORIAL_INITIAL_STATE.discardTop]
    }
    game.discard_pile = [game.last_card]
    game.current_reaction = TUTORIAL_INITIAL_STATE.discardTop

    const reservedCards = [...TUTORIAL_INITIAL_STATE.humanHand, ...TUTORIAL_INITIAL_STATE.aiHand]
      .reduce<Record<string, number>>((acc, type) => {
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {})

    game.draw_pile = game.draw_pile.filter((card) => {
      const remaining = reservedCards[card.type] || 0
      if (remaining <= 0) return true
      reservedCards[card.type] = remaining - 1
      return false
    })

    refreshCardCounts(game)
  } else {
    game.players.forEach((_player, index) => drawCardsForPlayer(game, index, initialCards))
  }

  room.status = 'playing'
  room.game_state = game
  scheduleTurnTimer(state, room)
  maybeScheduleAiTurn(state, room)
}

const getQueryParams = (url: URL) => Object.fromEntries(url.searchParams.entries())

const parseData = (config: AxiosRequestConfig) => {
  if (!config.data) return {}
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data)
    } catch {
      return {}
    }
  }
  return config.data as Record<string, any>
}

const success = (config: AxiosRequestConfig, data: any, status = 200): AxiosResponse => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: config as any
})

const failure = (config: AxiosRequestConfig, status: number, data: any): never => {
  const error: any = new Error(data?.error || 'Offline request failed')
  error.response = success(config, data, status)
  throw error
}

const updateStoredUser = (user: User | null, currentSessionId?: string | null) => {
  if (user) {
    const serialized = serializeUser(user)
    delete (serialized as Record<string, any>).password
    delete (serialized as Record<string, any>).username
    clientRuntimeStorage.setItem(CLIENT_RUNTIME_STORAGE_KEYS.user, JSON.stringify(serialized))
    clientRuntimeStorage.setItem(CLIENT_RUNTIME_STORAGE_KEYS.token, 'offline-token')
    clientRuntimeStorage.setItem(CLIENT_RUNTIME_STORAGE_KEYS.accessToken, 'offline-access-token')
    clientRuntimeStorage.setItem(CLIENT_RUNTIME_STORAGE_KEYS.refreshToken, 'offline-refresh-token')
    if (currentSessionId) {
      sessionRepository.setCurrentSessionId(currentSessionId)
    }
  } else {
    sessionRepository.clearStoredTokens()
  }
  window.dispatchEvent(new Event('auth-changed'))
}

const parseImportedEntries = (body: Record<string, any>) => {
  const entries = body.entries || body.bundle?.entries || null
  if (!entries || typeof entries !== 'object') {
    return null
  }

  const normalized: Record<string, string> = {}
  Object.entries(entries).forEach(([key, value]) => {
    if (typeof value !== 'string') {
      normalized[key] = JSON.stringify(value)
      return
    }
    normalized[key] = value
  })
  return normalized
}

const dispatchOfflineRequestSync = async (config: AxiosRequestConfig): Promise<DispatchResult> => {
  const method = String(config.method || 'get').toUpperCase()
  const url = new URL(config.url || '/', 'http://offline.local')
  const path = url.pathname.replace(/^\/api/, '') || '/'
  const body = parseData(config)
  const query = getQueryParams(url)
  let state = readState()

  const authed = () => requireAuth(state)


  try {
    if (method === 'GET' && path === '/auth/config') {
      const host = getClientRuntimeHost()
      const trustedHost = host === 'electron' || host === 'capacitor'
      return {
        status: 200,
        data: {
          enable_email: false,
          smtp_enabled: false,
          enable_oauth: false,
          enable_webauthn: false,
          offline_mode: true,
          host,
          trust_level: trustedHost ? 'trusted-local-host' : 'browser-untrusted',
          trust_notice: trustedHost
            ? 'Security features run with local-host trust assumptions in offline mode.'
            : 'Browser-only offline mode cannot enforce server-grade trust boundaries for WebAuthn/2FA/email recovery.',
        }
      }
    }
    if (isSecuritySensitivePath(path)) {
      return buildSecurityGateResponse(path)
    }
    if (method === 'POST' && path === '/auth/offline-profile') {
      const nickname = String(body.nickname || '').trim()
      const avatar = String(body.avatar || 'flask').trim() || 'flask'
      if (!nickname) throw { status: 400, data: { error: 'Nickname is required' } }

      // Thoroughly clear any previous legacy data before initializing a new profile
      const newState = resetOfflineState()

      const user = makeLocalPlayer(nickname, avatar)
      newState.users = [user]
      newState.session_uid = user.uid
      const session = sessionRepository.create(user.uid, {
        ...buildSessionContext(),
        expiresAt: new Date(nowMs() + OFFLINE_SESSION_TTL_MS).toISOString(),
      })

      writeState(newState)
      state = newState
      updateStoredUser(user, session.id)
      return { status: 200, data: { user: serializeUser(user), token: 'offline-token' } }
    }
    if (method === 'POST' && path === '/auth/register') {
      return dispatchOfflineRequestSync({ ...config, method: 'POST', url: '/auth/offline-profile', data: config.data })
    }
    if (method === 'POST' && path === '/auth/login') {
      const nickname = String(body.nickname || body.identifier || body.username || '').trim()
      if (!nickname) throw { status: 400, data: { error: 'Nickname is required' } }
      
      // Thoroughly clear any previous legacy data before initializing a new session
      const newState = resetOfflineState()
      
      const user = makeLocalPlayer(nickname)
      newState.users = [user]
      newState.session_uid = user.uid
      const session = sessionRepository.create(user.uid, {
        ...buildSessionContext(),
        expiresAt: new Date(nowMs() + OFFLINE_SESSION_TTL_MS).toISOString(),
      })
      
      writeState(newState)
      state = newState
      updateStoredUser(user, session.id)
      return { status: 200, data: { user: serializeUser(user), token: 'offline-token' } }
    }
    if (method === 'POST' && path === '/auth/logout') {
      const user = currentUser(state)
      const currentSessionId = sessionRepository.getCurrentSessionId()
      if (user && currentSessionId) {
        sessionRepository.revoke(currentSessionId, nowISO(), user.uid)
      }
      state.session_uid = null
      writeState(state)
      updateStoredUser(null)
      return { status: 200, data: { ok: true } }
    }
    if (method === 'POST' && path === '/auth/offline-profile/reset') {
      state = resetOfflineState()
      return { status: 200, data: { ok: true } }
    }
    if (method === 'POST' && path === '/auth/refresh') {
      const user = authed()
      return { status: 200, data: { access_token: 'offline-access-token', refresh_token: 'offline-refresh-token', user: serializeUser(user) } }
    }
    if (method === 'GET' && path === '/user/info') return { status: 200, data: serializeUser(authed()) }
    if (method === 'PUT' && path === '/user/profile') {
      const user = authed()
      Object.assign(user, body)
      writeState(state)
      updateStoredUser(user)
      return { status: 200, data: serializeUser(user) }
    }
    if (method === 'PUT' && path === '/user/avatar') {
      const user = authed()
      user.avatar = body.avatar || user.avatar
      writeState(state)
      updateStoredUser(user)
      return { status: 200, data: serializeUser(user) }
    }
    if (method === 'GET' && path.startsWith('/user/profile/')) {
      const uid = Number(path.split('/').pop())
      const user = state.users.find((item) => item.uid === uid)
      if (!user) throw { status: 404, data: { error: 'User not found' } }
      return { status: 200, data: serializeUser(user) }
    }
    if (method === 'GET' && path === '/version') return { status: 200, data: { version: 'offline', fullVersion: 'Chemistry UNO Offline Local Build' } }
    if (method === 'GET' && path === '/announcements') return { status: 200, data: announcementRepository.read(defaultAnnouncements) }
    if (method === 'GET' && path === '/hints') return { status: 200, data: hints }
    if (method === 'POST' && path === '/runtime/export') {
      authed()
      runtimeSqlite.flush()
      const bundle = stateRepository.exportBundle() as Record<string, any>
      bundle.sqlite = {
        encoding: 'base64',
        data: runtimeSqlite.exportImage(),
      }
      return { status: 200, data: bundle }
    }
    if (method === 'POST' && path === '/runtime/import') {
      authed()
      const entries = parseImportedEntries(body)
      if (!entries) {
        throw { status: 400, data: { error: 'Import payload must include entries' } }
      }

      const mode = String(body.mode || 'merge') === 'replace' ? 'replace' : 'merge'
      if (mode === 'replace') {
        stateRepository.clear((key) => key !== CLIENT_RUNTIME_STORAGE_KEYS.theme)
      }

      stateRepository.import(entries)
      if (typeof body.sqlite?.data === 'string') {
        await runtimeSqlite.importImage(body.sqlite.data)
        runtimeIndexesReady = false
        rebuildRuntimeIndexes()
      } else if (typeof body.bundle?.sqlite?.data === 'string') {
        await runtimeSqlite.importImage(body.bundle.sqlite.data)
        runtimeIndexesReady = false
        rebuildRuntimeIndexes()
      } else {
        await runtimeSqlite.reload()
        runtimeIndexesReady = false
        rebuildRuntimeIndexes()
      }
      state = readState()
      const current = currentUser(state)
      if (current) {
        updateStoredUser(current)
      }

      return {
        status: 200,
        data: {
          ok: true,
          mode,
          imported_keys: Object.keys(entries).length,
        }
      }
    }
    if (method === 'GET' && path === '/feedbacks/my') {
      const user = authed()
      return { status: 200, data: state.feedbacks.filter((item) => item.uid === user.uid) }
    }
    if (method === 'POST' && path === '/feedback') {
      const user = authed()
      const item: FeedbackItem = { id: state.next_feedback_id++, uid: user.uid, content: String(body.content || ''), type: String(body.type || 'general'), status: 'unread', created_at: nowISO() }
      state.feedbacks.unshift(item)
      writeState(state)
      return { status: 200, data: { ok: true, id: item.id } }
    }
    if (method === 'GET' && path === '/admin/feedbacks') {
      requireCapability(state, 'moderate')
      return { status: 200, data: state.feedbacks }
    }
    if (method === 'POST' && /^\/admin\/feedbacks\/\d+\/status$/.test(path)) {
      requireCapability(state, 'moderate')
      const feedbackId = Number(path.split('/')[3])
      const feedback = state.feedbacks.find((item) => item.id === feedbackId)
      if (!feedback) {
        throw { status: 404, data: { error: 'Feedback not found' } }
      }
      feedback.status = String(body.status || feedback.status || 'reviewed')
      writeState(state)
      return { status: 200, data: feedback }
    }
    if (method === 'GET' && path === '/friends') {
      const user = authed()
      const friends = state.friends.filter((item) => item.uid === user.uid).map((item) => {
        const target = getPlayerInfo(state, item.friend_uid)
        return target ? { ...serializeUser(target), remark: item.remark, is_online: true } : null
      }).filter(Boolean)
      return { status: 200, data: friends }
    }
    if (method === 'POST' && path === '/friends/request') {
      const user = authed()
      const friendUid = Number(body.friend_uid)
      if (!friendUid || friendUid === user.uid) throw { status: 400, data: { error: 'Invalid friend uid' } }
      if (!state.users.some((item) => item.uid === friendUid)) throw { status: 404, data: { error: 'User not found' } }
      if (!state.friends.some((item) => item.uid === user.uid && item.friend_uid === friendUid)) state.friends.push({ uid: user.uid, friend_uid: friendUid })
      if (!state.friends.some((item) => item.uid === friendUid && item.friend_uid === user.uid)) state.friends.push({ uid: friendUid, friend_uid: user.uid })
      writeState(state)
      return { status: 200, data: { ok: true } }
    }
    if (method === 'GET' && path === '/my-decks') {
      const user = authed()
      return { status: 200, data: state.decks.filter((deck) => deck.is_global || deck.created_by === user.uid) }
    }
    if (method === 'POST' && path === '/my-decks') {
      const user = authed()
      const deck: Deck = { id: state.next_deck_id++, name: String(body.name || 'Offline Deck'), is_global: false, cards: clone(body.cards || builtinDeck), initial_cards: Number(body.initial_cards || 10), created_by: user.uid, created_at: nowISO() }
      state.decks.push(deck)
      writeState(state)
      return { status: 200, data: deck }
    }
    if ((method === 'PUT' || method === 'DELETE') && path.startsWith('/my-decks/')) {
      const user = authed()
      const deckId = Number(path.split('/').pop())
      const deck = state.decks.find((item) => item.id === deckId && !item.is_global && item.created_by === user.uid)
      if (!deck) throw { status: 404, data: { error: 'Deck not found' } }
      if (method === 'PUT') {
        deck.name = body.name || deck.name
        deck.cards = clone(body.cards || deck.cards)
        deck.initial_cards = Number(body.initial_cards || deck.initial_cards)
        writeState(state)
        return { status: 200, data: deck }
      }
      state.decks = state.decks.filter((item) => item.id !== deckId)
      writeState(state)
      return { status: 200, data: { ok: true } }
    }
    if (method === 'GET' && path === '/rooms') {
      authed()
      return { status: 200, data: state.rooms.filter((room) => !room.is_private || room.players.includes(state.session_uid || -1)) }
    }
    if (method === 'POST' && path === '/rooms') {
      const user = authed()
      const deck = state.decks.find((item) => item.id === Number(body.deck_id)) || state.decks[0]
      const room: Room = {
        id: randomId('room'), name: String(body.name || 'Offline Room'), players: [user.uid], ready_uids: [], countdown: 0, spectators: [], max_players: Number(body.max_players || 4),
        deck_config: clone(deck), status: 'waiting', is_points_mode: Boolean(body.is_points_mode), is_private: Boolean(body.is_private), access_key: body.access_key || '', created_at: nowISO(),
        is_pve: Boolean(body.is_pve), pve_difficulty: Number(body.pve_difficulty || 0), ai_count: Number(body.ai_count || 0), enable_ai_backfill: Boolean(body.enable_ai_backfill),
        ai_backfill_difficulty: Number(body.ai_backfill_difficulty || 0), created_by_uid: user.uid,
        tutorial_script: Boolean(body.tutorial_script), room_messages: []
      }
      state.rooms.unshift(room)
      writeState(state)
      emitRoomsUpdate(state)
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'GET' && /^\/rooms\/[^/]+$/.test(path)) {
      authed()
      const room = ensureRoom(state, path.split('/')[2])
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'GET' && /^\/rooms\/[^/]+\/status$/.test(path)) {
      const roomId = path.split('/')[2]
      const room = state.rooms.find((item) => item.id === roomId)
      return { status: 200, data: room ? { exists: true, status: room.status } : { exists: false, status: 'closed' } }
    }
    if (method === 'POST' && /^\/rooms\/[^/]+\/join$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      const asSpectator = query.spectator === 'true'
      if (room.is_private && room.access_key && room.access_key !== query.key && room.created_by_uid !== user.uid) throw { status: 403, data: { error: 'Invalid room key' } }
      if (asSpectator) {
        if (!room.spectators.includes(user.uid)) room.spectators.push(user.uid)
      } else if (!room.players.includes(user.uid)) {
        if (room.players.length >= room.max_players) throw { status: 400, data: { error: 'Room is full' } }
        room.players.push(user.uid)
        emit('player_joined', { type: 'player_joined', data: room.id })
      }
      writeState(state)
      emitRoomsUpdate(state)
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'POST' && /^\/rooms\/[^/]+\/leave$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      room.players = room.players.filter((uid) => uid !== user.uid)
      room.ready_uids = room.ready_uids.filter((uid) => uid !== user.uid)
      room.spectators = room.spectators.filter((uid) => uid !== user.uid)
      if (room.game_state) {
        const index = findPlayerIndexByUid(room.game_state, user.uid)
        if (index >= 0) {
          room.game_state.quitted_count += 1
          appendFinishedPlayer(room.game_state, user.uid)
          finishGameIfNeeded(state, room)
        }
      }
      if (room.players.length === 0 && (!room.game_state || room.game_state.status !== 'playing')) state.rooms = state.rooms.filter((item) => item.id !== room.id)
      writeState(state)
      emit('player_left', { type: 'player_left', data: room.id })
      emitRoomsUpdate(state)
      return { status: 200, data: { ok: true } }
    }
    if (method === 'POST' && /^\/rooms\/[^/]+\/ready$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      if (room.ready_uids.includes(user.uid)) room.ready_uids = room.ready_uids.filter((uid) => uid !== user.uid)
      else room.ready_uids.push(user.uid)
      writeState(state)
      emitRoomsUpdate(state)
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'POST' && /^\/rooms\/[^/]+\/start$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      if (room.created_by_uid !== user.uid) throw { status: 403, data: { error: 'Only the host can start offline games' } }
      if (!room.is_pve && room.players.length < 2) throw { status: 400, data: { error: 'At least two local players are required' } }
      if (room.status === 'playing' && room.game_state) {
        return { status: 200, data: roomSnapshot(state, room) }
      }
      buildGameState(state, room)
      writeState(state)
      emitGameUpdate(room)
      emitRoomsUpdate(state)
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'POST' && /^\/rooms\/[^/]+\/play$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      const game = ensureGame(room)
      const index = findPlayerIndexByUid(game, user.uid)
      if (index !== game.current_player) throw { status: 400, data: { error: 'Not your turn' } }
      const playedSubstance = String(body.substance || body.card?.type || '')
      applyPlay(state, room, index, playedSubstance)
      maybeAdvanceTutorialForHumanAction(room, index, 'play', playedSubstance)
      advanceTurn(state, room)
      writeState(state)
      emitGameUpdate(room)
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'POST' && /^\/rooms\/[^/]+\/play-double$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      const game = ensureGame(room)
      const index = findPlayerIndexByUid(game, user.uid)
      if (index !== game.current_player) throw { status: 400, data: { error: 'Not your turn' } }
      const player = game.players[index]
      const sub1 = String(body.sub1 || '')
      const sub2 = String(body.sub2 || '')
      if (!player.double_action_available && player.action_progress < 2) throw { status: 400, data: { error: 'Double action is not ready' } }
      applyPlay(state, room, index, sub1)
      player.double_action_available = false
      player.action_progress = 0
      if (sub2) applyPlay(state, room, index, sub2, [sub1, sub2])
      maybeAdvanceTutorialForHumanAction(room, index, 'double', `${sub1}+${sub2}`)
      advanceTurn(state, room)
      writeState(state)
      emitGameUpdate(room)
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'POST' && /^\/rooms\/[^/]+\/draw$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      const game = ensureGame(room)
      const index = findPlayerIndexByUid(game, user.uid)
      if (index !== game.current_player) throw { status: 400, data: { error: 'Not your turn' } }
      const drawCount = Math.max(1, game.pending_draw_count || 1)
      drawCardsForPlayer(game, index, drawCount)
      game.pending_draw_count = 0
      game.pending_draw_types = []
      maybeAdvanceTutorialForHumanAction(room, index, 'draw')
      advanceTurn(state, room)
      writeState(state)
      emitGameUpdate(room)
      return { status: 200, data: roomSnapshot(state, room) }
    }
    if (method === 'GET' && /^\/rooms\/[^/]+\/substances$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      const game = ensureGame(room)
      const index = findPlayerIndexByUid(game, user.uid)
      if (index < 0) throw { status: 403, data: { error: 'You are not in this room' } }
      return { status: 200, data: getAvailableSubstances(game.players[index].hand_cards) }
    }
    if (method === 'GET' && /^\/rooms\/[^/]+\/reaction-hints$/.test(path)) {
      const user = authed()
      const room = ensureRoom(state, path.split('/')[2])
      const game = ensureGame(room)
      const index = findPlayerIndexByUid(game, user.uid)
      const available = index >= 0 ? getAvailableSubstances(game.players[index].hand_cards) : []
      const hintsData = available
        .filter((formula) => !game.last_card || isReactionPair(game.last_card.substance, formula))
        .slice(0, 12)
        .map((formula, idx) => ({ id: idx + 1, formula, substance: formula, name: substanceNameByFormula.get(formula) || formula }))
      return { status: 200, data: hintsData }
    }
    if (method === 'POST' && path === '/game/check-reaction') {
      const valid = isReactionPair(String(body.r1 || ''), String(body.r2 || ''))
      return { status: 200, data: { can_react: valid, valid } }
    }
    if (method === 'GET' && path === '/level/info') {
      const user = authed()
      return { status: 200, data: { level: user.level, exp: user.exp, next_level_exp: user.level * 100 } }
    }
    if (method === 'GET' && path === '/level/leaderboard') {
      authed()
      const fallback = state.users
        .map((user) => ({
          uid: user.uid,
          nickname: user.nickname,
          avatar: user.avatar,
          points: user.points,
          exp: user.exp,
          level: user.level,
        }))
        .sort((left, right) => right.points - left.points)
      return { status: 200, data: leaderboardRepository.read(fallback) }
    }
    if (method === 'GET' && path === '/level/configs') {
      authed()
      return { status: 200, data: configRepository.read(defaultLevelConfigs) }
    }
    if (method === 'GET' && path === '/data/substances') {
      return { status: 200, data: substanceRepository.read(buildDefaultSubstances()) }
    }
    if (method === 'GET' && path === '/data/substances/my') {
      const user = authed()
      const records = readRuntimeSubstances().filter((item) => Number(item.creator_uid) === user.uid)
      return { status: 200, data: records }
    }
    if (method === 'GET' && /^\/data\/substances\/\d+\/group$/.test(path)) {
      const substanceId = Number(path.split('/')[3])
      const records = readRuntimeSubstances()
      const target = records.find((item) => Number(item.id) === substanceId)
      if (!target) {
        throw { status: 404, data: { error: 'Substance not found' } }
      }
      const groupId = target.group_id == null ? target.id : target.group_id
      const grouped = records.filter((item) => (item.group_id == null ? item.id : item.group_id) === groupId)
      return { status: 200, data: grouped }
    }
    if (method === 'POST' && path === '/data/substances/new') {
      const user = authed()
      const formula = String(body.formula || '').trim()
      const name = String(body.name || '').trim()
      if (!formula || !name) {
        throw { status: 400, data: { error: 'Formula and name are required' } }
      }

      const records = readRuntimeSubstances()
      const record = {
        id: nextNumericId(records),
        formula,
        name,
        elements: String(body.elements || formula),
        status: canModerate(user) ? 'approved' : 'pending_admin',
        group_id: null,
        needs_improvement: false,
        has_invalid_elements: false,
        creator_uid: user.uid,
        creator_name: user.nickname || user.username || 'local-user',
        created_at: nowISO(),
      }
      records.unshift(record)
      writeRuntimeSubstances(records)
      return { status: 200, data: record }
    }
    if (method === 'POST' && /^\/data\/substances\/\d+\/update$/.test(path)) {
      const user = authed()
      const substanceId = Number(path.split('/')[3])
      const records = readRuntimeSubstances()
      const target = records.find((item) => Number(item.id) === substanceId)
      if (!target) {
        throw { status: 404, data: { error: 'Substance not found' } }
      }
      const ownedByUser = Number(target.creator_uid) === user.uid
      if (!ownedByUser && !canModerate(user)) {
        throw { status: 403, data: { error: 'You cannot update this substance entry' } }
      }
      target.formula = String(body.formula || target.formula)
      target.name = String(body.name || target.name)
      target.elements = String(body.elements || target.elements || target.formula)
      target.status = canModerate(user) ? String(target.status || 'approved') : 'pending_admin'
      target.updated_at = nowISO()
      writeRuntimeSubstances(records)
      return { status: 200, data: target }
    }
    if (method === 'PUT' && /^\/data\/substances\/\d+$/.test(path)) {
      requireCapability(state, 'moderate')
      const substanceId = Number(path.split('/')[3])
      const records = readRuntimeSubstances()
      const target = records.find((item) => Number(item.id) === substanceId)
      if (!target) {
        throw { status: 404, data: { error: 'Substance not found' } }
      }
      target.formula = String(body.formula || target.formula)
      target.name = String(body.name || target.name)
      target.elements = String(body.elements || target.elements || target.formula)
      target.status = String(body.status || target.status || 'approved')
      target.updated_at = nowISO()
      writeRuntimeSubstances(records)
      return { status: 200, data: target }
    }
    if (method === 'POST' && /^\/data\/substances\/\d+\/approve$/.test(path)) {
      requireCapability(state, 'moderate')
      const substanceId = Number(path.split('/')[3])
      const records = readRuntimeSubstances()
      const target = records.find((item) => Number(item.id) === substanceId)
      if (!target) {
        throw { status: 404, data: { error: 'Substance not found' } }
      }
      target.status = 'approved'
      target.reviewed_at = nowISO()
      writeRuntimeSubstances(records)
      return { status: 200, data: target }
    }
    if (method === 'DELETE' && /^\/data\/substances\/\d+\/reject$/.test(path)) {
      requireCapability(state, 'moderate')
      const substanceId = Number(path.split('/')[3])
      const records = readRuntimeSubstances()
      const target = records.find((item) => Number(item.id) === substanceId)
      if (!target) {
        throw { status: 404, data: { error: 'Substance not found' } }
      }
      target.status = 'rejected'
      target.reviewed_at = nowISO()
      writeRuntimeSubstances(records)
      return { status: 200, data: { ok: true } }
    }
    if (method === 'GET' && path === '/substances/names') {
      const names = substanceRepository.read(buildDefaultSubstances()).reduce<Record<string, string>>((acc, item) => {
        const formula = String(item.formula || '').trim()
        if (!formula) return acc
        acc[formula] = String(item.name || formula)
        return acc
      }, {})
      return { status: 200, data: names }
    }
    if (method === 'GET' && (path === '/reactions' || path === '/reactions/all' || path === '/reactions/my')) {
      const current = currentUser(state)
      let reactions = readRuntimeReactions()

      if (path === '/reactions/all') {
        reactions = reactions.filter((item) => item.status === 'approved')
      }
      if (path === '/reactions/my') {
        const user = authed()
        reactions = reactions.filter((item) => Number(item.creator_uid) === user.uid)
      }

      const queryText = String(query.q || '').trim().toLowerCase()
      if (queryText) {
        reactions = reactions.filter((item) => [item.display, item.r1, item.r2]
          .map((value) => String(value || '').toLowerCase())
          .some((value) => value.includes(queryText)))
      }

      if (query.status && query.status !== 'all') {
        reactions = reactions.filter((item) => String(item.status || '').toLowerCase() === String(query.status || '').toLowerCase())
      }

      const hasInvalid = parseBooleanQueryValue(query.has_invalid)
      if (hasInvalid !== null) {
        reactions = reactions.filter((item) => Boolean(item.has_invalid_elements) === hasInvalid)
      }

      reactions = reactions.sort((left, right) => Number(right.id || 0) - Number(left.id || 0))
      const paginated = query.paginated === '1' || query.paginated === 'true'
      if (paginated) {
        const page = Number(query.page || 1)
        const pageSize = Number(query.page_size || query.pageSize || 30)
        return { status: 200, data: paginateRecords(reactions, page, pageSize) }
      }

      // 非登录场景下允许浏览公开已审核数据
      if (!current && path !== '/reactions/all') {
        reactions = reactions.filter((item) => item.status === 'approved')
      }
      return { status: 200, data: reactions }
    }
    if (method === 'POST' && path === '/reactions') {
      const user = authed()
      const display = String(body.display || '').trim()
      if (!display) {
        throw { status: 400, data: { error: 'Reaction display is required' } }
      }

      const reactions = readRuntimeReactions()
      const match = display.match(/^\s*([^=+]+?)\s*\+\s*([^=+]+?)\s*=.*$/)
      const r1 = String(match?.[1] || body.r1 || '').trim() || 'Unknown'
      const r2 = String(match?.[2] || body.r2 || '').trim() || 'Unknown'
      const record = {
        id: nextNumericId(reactions),
        r1,
        r2,
        display,
        status: canModerate(user) ? 'approved' : 'pending_admin',
        creator_uid: user.uid,
        creator_name: user.nickname || user.username || 'local-user',
        has_invalid_elements: false,
        created_at: nowISO(),
      }
      reactions.unshift(record)
      writeRuntimeReactions(reactions)
      return { status: 200, data: record }
    }
    if (method === 'POST' && path === '/reactions/batch') {
      const user = authed()
      const payload = Array.isArray(body) ? body : []
      const reactions = readRuntimeReactions()
      let nextId = nextNumericId(reactions)
      const created = payload
        .map((entry: Record<string, any>) => String(entry?.display || '').trim())
        .filter(Boolean)
        .map((display) => {
          const match = display.match(/^\s*([^=+]+?)\s*\+\s*([^=+]+?)\s*=.*$/)
          return {
            id: nextId++,
            r1: String(match?.[1] || 'Unknown').trim(),
            r2: String(match?.[2] || 'Unknown').trim(),
            display,
            status: canModerate(user) ? 'approved' : 'pending_admin',
            creator_uid: user.uid,
            creator_name: user.nickname || user.username || 'local-user',
            has_invalid_elements: false,
            created_at: nowISO(),
          }
        })

      created.forEach((item) => reactions.unshift(item))
      writeRuntimeReactions(reactions)
      return { status: 200, data: { ok: true, inserted: created.length } }
    }
    if (method === 'PUT' && /^\/reactions\/approve\/.+/.test(path)) {
      requireCapability(state, 'moderate')
      const reactionToken = String(path.split('/').pop() || '').trim()
      const reactions = readRuntimeReactions()
      const target = reactions.find((item) => String(item.id) === reactionToken || String(item.group_id || '') === reactionToken)
      if (!target) {
        throw { status: 404, data: { error: 'Reaction not found' } }
      }
      target.display = String(body.display || target.display)
      target.status = body.reject ? 'rejected' : 'approved'
      target.reviewed_at = nowISO()
      writeRuntimeReactions(reactions)
      return { status: 200, data: target }
    }
    if (method === 'PUT' && /^\/reactions\/\d+$/.test(path)) {
      const user = authed()
      const reactionId = Number(path.split('/').pop())
      const reactions = readRuntimeReactions()
      const target = reactions.find((item) => Number(item.id) === reactionId)
      if (!target) {
        throw { status: 404, data: { error: 'Reaction not found' } }
      }
      const ownedByUser = Number(target.creator_uid) === user.uid
      if (!ownedByUser && !canModerate(user)) {
        throw { status: 403, data: { error: 'You cannot edit this reaction entry' } }
      }
      target.display = String(body.display || target.display)
      target.status = canModerate(user) ? String(target.status || 'approved') : 'pending_admin'
      target.updated_at = nowISO()
      writeRuntimeReactions(reactions)
      return { status: 200, data: target }
    }
    if (method === 'DELETE' && /^\/reactions\/\d+$/.test(path)) {
      requireCapability(state, 'moderate')
      const reactionId = Number(path.split('/').pop())
      const reactions = readRuntimeReactions()
      const before = reactions.length
      const next = reactions.filter((item) => Number(item.id) !== reactionId)
      if (next.length === before) {
        throw { status: 404, data: { error: 'Reaction not found' } }
      }
      writeRuntimeReactions(next)
      return { status: 200, data: { ok: true } }
    }
    if (method === 'GET' && path === '/user/game-history') {
      const user = authed()
      return { status: 200, data: state.histories.filter((item) => item.players.includes(user.uid)) }
    }
    if (method === 'GET' && /^\/user\/game-history\/\d+\/replay$/.test(path)) {
      const historyId = Number(path.split('/')[3])
      const history = state.histories.find((item) => item.id === historyId)
      if (!history) throw { status: 404, data: { error: 'Replay not found' } }
      return { status: 200, data: history }
    }
    if (method === 'GET' && path === '/user/sessions') {
      const user = authed()
      const currentSessionId = sessionRepository.getCurrentSessionId()
      const sessions = sessionRepository.listActive(user.uid).map((session) => ({
        id: session.id,
        created_at: session.created_at,
        last_active: session.last_active,
        expires_at: session.expires_at,
        user_agent: session.user_agent,
        ip: session.ip,
        host: session.host,
        mode: session.mode,
        is_current: session.id === currentSessionId,
        current: session.id === currentSessionId,
      }))
      return { status: 200, data: sessions }
    }
    if (method === 'POST' && path === '/user/sessions/logout') {
      const user = authed()
      const targetSessionId = String(body.id || '').trim()
      if (!targetSessionId) {
        throw { status: 400, data: { error: 'Session id is required' } }
      }

      const revoked = sessionRepository.revoke(targetSessionId, nowISO(), user.uid)
      if (!revoked) {
        throw { status: 404, data: { error: 'Session not found' } }
      }

      const isCurrentSession = sessionRepository.getCurrentSessionId() === targetSessionId
      if (isCurrentSession) {
        state.session_uid = null
        updateStoredUser(null)
      }

      return { status: 200, data: { ok: true, is_current: isCurrentSession } }
    }
    if (method === 'GET' && path === '/admin/capabilities') {
      const user = authed()
      return {
        status: 200,
        data: {
          role: getUserRole(user),
          is_admin: isAdminUser(user),
          can_moderate: canModerate(user),
          trust_notice: 'Frontend-only privileged flows are local capability gates and do not provide server-enforced isolation.',
        }
      }
    }
    if (method === 'GET' && path === '/admin/trust-boundary') {
      authed()
      return {
        status: 200,
        data: {
          host: getClientRuntimeHost(),
          trust_notice: 'Privileged workflows run under local trust assumptions in frontend-only mode. Treat this as convenience controls, not hardened security boundaries.',
        }
      }
    }
    if (method === 'GET' && path === '/admin/announcements') {
      requireCapability(state, 'moderate')
      return { status: 200, data: announcementRepository.read(defaultAnnouncements) }
    }
    if (method === 'POST' && path === '/admin/announcements') {
      requireCapability(state, 'moderate')
      const announcements = announcementRepository.read(defaultAnnouncements)
      const announcement = {
        id: nextNumericId(announcements),
        title: String(body.title || '').trim() || 'Untitled',
        content: String(body.content || '').trim(),
        type: String(body.type || 'info'),
        is_ticker: Boolean(body.is_ticker),
        is_persistent: body.is_persistent === undefined ? true : Boolean(body.is_persistent),
        created_at: nowISO(),
      }
      announcements.unshift(announcement)
      announcementRepository.write(announcements)
      return { status: 200, data: announcement }
    }
    if (method === 'PUT' && /^\/admin\/announcements\/\d+$/.test(path)) {
      requireCapability(state, 'moderate')
      const announcementId = Number(path.split('/')[3])
      const announcements = announcementRepository.read(defaultAnnouncements)
      const target = announcements.find((item) => Number(item.id) === announcementId)
      if (!target) {
        throw { status: 404, data: { error: 'Announcement not found' } }
      }
      target.title = String(body.title || target.title)
      target.content = String(body.content || target.content)
      target.type = String(body.type || target.type || 'info')
      target.is_ticker = body.is_ticker === undefined ? target.is_ticker : Boolean(body.is_ticker)
      target.is_persistent = body.is_persistent === undefined ? target.is_persistent : Boolean(body.is_persistent)
      target.updated_at = nowISO()
      announcementRepository.write(announcements)
      return { status: 200, data: target }
    }
    if (method === 'DELETE' && /^\/admin\/announcements\/\d+$/.test(path)) {
      requireCapability(state, 'moderate')
      const announcementId = Number(path.split('/')[3])
      const announcements = announcementRepository.read(defaultAnnouncements)
      const nextAnnouncements = announcements.filter((item) => Number(item.id) !== announcementId)
      if (nextAnnouncements.length === announcements.length) {
        throw { status: 404, data: { error: 'Announcement not found' } }
      }
      announcementRepository.write(nextAnnouncements)
      return { status: 200, data: { ok: true } }
    }
    if (method === 'GET' && path === '/admin/configs') {
      requireCapability(state, 'admin')
      return { status: 200, data: configRepository.read(defaultLevelConfigs) }
    }
    if ((method === 'PUT' || method === 'POST') && path === '/admin/configs') {
      requireCapability(state, 'admin')
      const nextConfigs = configRepository.merge(body || {}, defaultLevelConfigs)
      return { status: 200, data: nextConfigs }
    }
    if (method === 'GET' && (path === '/surveys/active' || path === '/surveys/all')) return { status: 200, data: [] }
    if (method === 'GET' && path === '/plugins') return { status: 200, data: [] }
    if (method === 'GET' && path === '/plugin-cards') return { status: 200, data: [] }
    if (method === 'GET' && path === '/chat/global/history') return { status: 200, data: state.global_messages.slice(-Number(query.limit || 50)) }
    if (method === 'GET' && path.startsWith('/chat/private/history/')) return { status: 200, data: [] }

    return { status: 200, data: [] }
  } catch (error: any) {
    if (error?.status) return error
    return { status: 500, data: { error: error?.message || 'Local runtime error' } }
  } finally {
    writeState(state)
  }
}

export const dispatchOfflineRequest = async (config: AxiosRequestConfig): Promise<DispatchResult> => {
  await ensureLocalRuntimeReady()
  return dispatchOfflineRequestSync(config)
}

export const offlineAxiosAdapter: AxiosAdapter = async (config) => {
  await sleep(30)
  const result = await dispatchOfflineRequest(config)
  if (result.status >= 400) failure(config, result.status, result.data)
  return success(config, result.data, result.status)
}

export const installOfflineFetchInterceptor = () => {
  const g = window as Window & typeof globalThis & { __offlineFetchInstalled?: boolean; __offlineOriginalFetch?: typeof fetch }
  if (g.__offlineFetchInstalled) return
  g.__offlineFetchInstalled = true
  g.__offlineOriginalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const url = new URL(requestUrl, window.location.origin)
    if (!url.pathname.startsWith('/api/')) return g.__offlineOriginalFetch!(input as any, init)

    const result = await dispatchOfflineRequest({ url: url.pathname + url.search, method: init?.method || 'GET', data: init?.body })
    return new Response(JSON.stringify(result.data), { status: result.status, headers: { 'Content-Type': 'application/json' } })
  }
}

const sendOfflineChat = (payload: { uid: number; nickname: string; username: string; avatar: string; message: string; target_uid?: number }) => {
  if (payload.target_uid) {
    emit('private_chat', { type: 'private_chat', uid: payload.uid, target_uid: payload.target_uid, message: payload.message, data: { nickname: payload.nickname, username: payload.username, avatar: payload.avatar } })
    return
  }
  emit('chat', { type: 'chat', uid: payload.uid, message: payload.message, data: { nickname: payload.nickname, username: payload.username, avatar: payload.avatar } })
}

export const seedOfflineTestState = (partial: Partial<State>) => {
  const baseState = readState()
  const nextState: State = {
    ...baseState,
    ...partial,
    users: partial.users || baseState.users,
    decks: partial.decks || baseState.decks,
    rooms: partial.rooms || baseState.rooms,
    histories: partial.histories || baseState.histories,
    feedbacks: partial.feedbacks || baseState.feedbacks,
    friends: partial.friends || baseState.friends,
    global_messages: partial.global_messages || baseState.global_messages,
  }
  writeState(nextState)
  return clone(nextState)
}

export const resetOfflineTestState = () => {
  const nextState = resetOfflineState()
  return clone(nextState)
}

export const offlineSocket = {
  on(event: string, handler: (message: any) => void) {
    const listener = (e: Event) => handler((e as CustomEvent).detail)
    eventBus.addEventListener(event, listener)
    return () => eventBus.removeEventListener(event, listener)
  },
  sendRoomChat(roomId: string, message: string) {
    const state = readState()
    const user = currentUser(state)
    if (!user) return
    if (roomId === 'lobby') {
      const entry: ChatMessage = { user_uid: user.uid, username: user.username, nickname: user.nickname, avatar: user.avatar, message, created_at: nowISO() }
      pushGlobalChat(state, entry)
      writeState(state)
      sendOfflineChat({ uid: user.uid, username: user.username, nickname: user.nickname, avatar: user.avatar, message })
      emit('chat_unread_count', { type: 'chat_unread_count', count: 0 })
      return
    }
    const room = state.rooms.find((item) => item.id === roomId)
    if (!room) return
    const entry: RoomMessage = { uid: user.uid, username: user.username, nickname: user.nickname, avatar: user.avatar, message, created_at: nowISO() }
    room.room_messages.push(entry)
    room.room_messages = room.room_messages.slice(-100)
    writeState(state)
    sendOfflineChat({ uid: user.uid, username: user.username, nickname: user.nickname, avatar: user.avatar, message })
  }
}
