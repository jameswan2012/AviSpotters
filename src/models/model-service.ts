import { prisma } from "@/lib/db";
import { getModel, listIndex } from "@/models/data";

export async function listIndexMerged(_opts?: { includeHidden?: boolean }) {
  const overrides = await prisma.modelOverride.findMany({
    select: { manufacturerId: true, familyId: true, modelId: true, hidden: true, displayName: true, summary: true },
  });

  const overrideMap = new Map(overrides.map((row) => [`${row.manufacturerId}|${row.familyId}|${row.modelId}`, row]));

  return listIndex().map((item) => {
    const override = overrideMap.get(`${item.manufacturerId}|${item.familyId}|${item.modelId}`);
    return {
      ...item,
      name: override?.displayName || item.name,
      summary: override?.summary || undefined,
      hidden: !!override?.hidden,
    };
  });
}

export async function getModelMerged(
  manufacturerId: string,
  familyId: string,
  modelId: string,
  _opts?: { includeHidden?: boolean }
) {
  const base = getModel(manufacturerId, familyId, modelId);
  if (!base) return null;

  const override = await prisma.modelOverride.findUnique({
    where: {
      manufacturerId_familyId_modelId: {
        manufacturerId,
        familyId,
        modelId,
      },
    },
  });

  return {
    ...base,
    name: override?.displayName || base.name,
    summary: override?.summary || base.summary,
    hidden: !!override?.hidden,
  };
}
