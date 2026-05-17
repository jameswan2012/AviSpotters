import type { AircraftModel, Family, Manufacturer, ModelIndexItem } from "@/models/types";

import manufacturersJson from "@/data/models/manufacturers.json";
import boeingFamiliesJson from "@/data/models/families/Boeing.json";
import airbusFamiliesJson from "@/data/models/families/Airbus.json";
import embraerFamiliesJson from "@/data/models/families/Embraer.json";
import bombardierFamiliesJson from "@/data/models/families/Bombardier.json";
import comacFamiliesJson from "@/data/models/families/COMAC.json";
import atrFamiliesJson from "@/data/models/families/ATR.json";
import mcdFamiliesJson from "@/data/models/families/McDonnellDouglas.json";
import sukhoiFamiliesJson from "@/data/models/families/Sukhoi.json";
import irkutFamiliesJson from "@/data/models/families/Irkut.json";
import antonovFamiliesJson from "@/data/models/families/Antonov.json";
import indexJson from "@/data/models/index.json";
import boeing737700 from "@/data/models/aircraft/Boeing/737/737-700.json";
import boeing737800 from "@/data/models/aircraft/Boeing/737/737-800.json";
import boeing7378max from "@/data/models/aircraft/Boeing/737/737-8-MAX.json";
import boeing737900er from "@/data/models/aircraft/Boeing/737/737-900ER.json";
import boeing747400 from "@/data/models/aircraft/Boeing/747/747-400.json";
import boeing7478f from "@/data/models/aircraft/Boeing/747/747-8F.json";
import boeing757200 from "@/data/models/aircraft/Boeing/757/757-200.json";
import boeing767300er from "@/data/models/aircraft/Boeing/767/767-300ER.json";
import boeing767300f from "@/data/models/aircraft/Boeing/767/767-300F.json";
import boeing7879 from "@/data/models/aircraft/Boeing/787/787-9.json";
import boeing7878 from "@/data/models/aircraft/Boeing/787/787-8.json";
import boeing78710 from "@/data/models/aircraft/Boeing/787/787-10.json";
import boeing777300er from "@/data/models/aircraft/Boeing/777/777-300ER.json";
import boeing777200er from "@/data/models/aircraft/Boeing/777/777-200ER.json";
import boeing777f from "@/data/models/aircraft/Boeing/777/777F.json";
import airbusA320neo from "@/data/models/aircraft/Airbus/A320/A320neo.json";
import airbusA320200 from "@/data/models/aircraft/Airbus/A320/A320-200.json";
import airbusA321neo from "@/data/models/aircraft/Airbus/A320/A321neo.json";
import airbusA321xlr from "@/data/models/aircraft/Airbus/A320/A321XLR.json";
import airbusA220100 from "@/data/models/aircraft/Airbus/A220/A220-100.json";
import airbusA220300 from "@/data/models/aircraft/Airbus/A220/A220-300.json";
import airbusA330900 from "@/data/models/aircraft/Airbus/A330/A330-900.json";
import airbusA350900 from "@/data/models/aircraft/Airbus/A350/A350-900.json";
import airbusA3501000 from "@/data/models/aircraft/Airbus/A350/A350-1000.json";
import airbusA340300 from "@/data/models/aircraft/Airbus/A340/A340-300.json";
import airbusA380800 from "@/data/models/aircraft/Airbus/A380/A380-800.json";
import embraerE175 from "@/data/models/aircraft/Embraer/E-Jets/E175.json";
import embraerE190 from "@/data/models/aircraft/Embraer/E-Jets/E190.json";
import embraerE195E2 from "@/data/models/aircraft/Embraer/E2/E195-E2.json";
import bombardierCRJ900 from "@/data/models/aircraft/Bombardier/CRJ/CRJ-900.json";
import bombardierQ400 from "@/data/models/aircraft/Bombardier/Dash-8/Q400.json";
import comacARJ21700 from "@/data/models/aircraft/COMAC/ARJ21/ARJ21-700.json";
import comacC919 from "@/data/models/aircraft/COMAC/C919/C919.json";
import atr72600 from "@/data/models/aircraft/ATR/ATR-72/ATR-72-600.json";
import atr42600 from "@/data/models/aircraft/ATR/ATR-42/ATR-42-600.json";
import mcdMD82 from "@/data/models/aircraft/McDonnellDouglas/MD-80/MD-82.json";
import mcdMD11F from "@/data/models/aircraft/McDonnellDouglas/MD-11/MD-11F.json";
import mcdDC1030 from "@/data/models/aircraft/McDonnellDouglas/DC-10/DC-10-30.json";
import sukhoiSSJ from "@/data/models/aircraft/Sukhoi/SSJ/SSJ100-95.json";
import irkutMC21 from "@/data/models/aircraft/Irkut/MC-21/MC-21-300.json";
import antonovAn124 from "@/data/models/aircraft/Antonov/An-124/An-124-100.json";
import antonovAn225 from "@/data/models/aircraft/Antonov/An-225/An-225.json";

const manufacturers = manufacturersJson as Manufacturer[];
const index = indexJson as ModelIndexItem[];

const familiesByManufacturer: Record<string, Family[]> = {
  Boeing: boeingFamiliesJson as Family[],
  Airbus: airbusFamiliesJson as Family[],
  Embraer: embraerFamiliesJson as Family[],
  Bombardier: bombardierFamiliesJson as Family[],
  COMAC: comacFamiliesJson as Family[],
  ATR: atrFamiliesJson as Family[],
  McDonnellDouglas: mcdFamiliesJson as Family[],
  Sukhoi: sukhoiFamiliesJson as Family[],
  Irkut: irkutFamiliesJson as Family[],
  Antonov: antonovFamiliesJson as Family[],
};

export function listManufacturers() {
  return manufacturers;
}

export function getManufacturer(manufacturerId: string) {
  return manufacturers.find((m) => m.id === manufacturerId) ?? null;
}

export function listFamilies(manufacturerId: string) {
  return familiesByManufacturer[manufacturerId] ?? [];
}

export function getFamily(manufacturerId: string, familyId: string) {
  return listFamilies(manufacturerId).find((f) => f.familyId === familyId) ?? null;
}

export function listIndex() {
  return index;
}

export function getIndexItem(manufacturerId: string, familyId: string, modelId: string) {
  return (
    index.find(
      (i) => i.manufacturerId === manufacturerId && i.familyId === familyId && i.modelId === modelId
    ) ?? null
  );
}

export function getModel(manufacturerId: string, familyId: string, modelId: string): AircraftModel | null {
  const key = `${manufacturerId}|${familyId}|${modelId}`;
  return (MODEL_MAP[key] as AircraftModel | undefined) ?? null;
}

export function buildModelPage(manufacturerId: string, familyId: string, modelId: string) {
  return `/models/${encodeURIComponent(manufacturerId)}/${encodeURIComponent(familyId)}/${encodeURIComponent(
    modelId
  )}`;
}

const MODEL_MAP: Record<string, AircraftModel> = {
  "Boeing|737|737-700": boeing737700 as AircraftModel,
  "Boeing|737|737-800": boeing737800 as AircraftModel,
  "Boeing|737|737-8-MAX": boeing7378max as AircraftModel,
  "Boeing|737|737-900ER": boeing737900er as AircraftModel,
  "Boeing|747|747-400": boeing747400 as AircraftModel,
  "Boeing|747|747-8F": boeing7478f as AircraftModel,
  "Boeing|757|757-200": boeing757200 as AircraftModel,
  "Boeing|767|767-300ER": boeing767300er as AircraftModel,
  "Boeing|767|767-300F": boeing767300f as AircraftModel,
  "Boeing|777|777-200ER": boeing777200er as AircraftModel,
  "Boeing|777|777-300ER": boeing777300er as AircraftModel,
  "Boeing|777|777F": boeing777f as AircraftModel,
  "Boeing|787|787-8": boeing7878 as AircraftModel,
  "Boeing|787|787-9": boeing7879 as AircraftModel,
  "Boeing|787|787-10": boeing78710 as AircraftModel,

  "Airbus|A320|A320neo": airbusA320neo as AircraftModel,
  "Airbus|A320|A320-200": airbusA320200 as AircraftModel,
  "Airbus|A320|A321neo": airbusA321neo as AircraftModel,
  "Airbus|A320|A321XLR": airbusA321xlr as AircraftModel,
  "Airbus|A220|A220-100": airbusA220100 as AircraftModel,
  "Airbus|A220|A220-300": airbusA220300 as AircraftModel,
  "Airbus|A330|A330-900": airbusA330900 as AircraftModel,
  "Airbus|A350|A350-900": airbusA350900 as AircraftModel,
  "Airbus|A350|A350-1000": airbusA3501000 as AircraftModel,
  "Airbus|A340|A340-300": airbusA340300 as AircraftModel,
  "Airbus|A380|A380-800": airbusA380800 as AircraftModel,

  "Embraer|E-Jets|E175": embraerE175 as AircraftModel,
  "Embraer|E-Jets|E190": embraerE190 as AircraftModel,
  "Embraer|E2|E195-E2": embraerE195E2 as AircraftModel,

  "Bombardier|CRJ|CRJ-900": bombardierCRJ900 as AircraftModel,
  "Bombardier|Dash-8|Q400": bombardierQ400 as AircraftModel,

  "COMAC|ARJ21|ARJ21-700": comacARJ21700 as AircraftModel,
  "COMAC|C919|C919": comacC919 as AircraftModel,

  "ATR|ATR-72|ATR-72-600": atr72600 as AircraftModel,
  "ATR|ATR-42|ATR-42-600": atr42600 as AircraftModel,

  "McDonnellDouglas|MD-80|MD-82": mcdMD82 as AircraftModel,
  "McDonnellDouglas|MD-11|MD-11F": mcdMD11F as AircraftModel,
  "McDonnellDouglas|DC-10|DC-10-30": mcdDC1030 as AircraftModel,

  "Sukhoi|SSJ|SSJ100-95": sukhoiSSJ as AircraftModel,
  "Irkut|MC-21|MC-21-300": irkutMC21 as AircraftModel,
  "Antonov|An-124|An-124-100": antonovAn124 as AircraftModel,
  "Antonov|An-225|An-225": antonovAn225 as AircraftModel,
};

