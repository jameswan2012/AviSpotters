const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.DEFAULT_SUPERADMIN_EMAIL || "admin").trim().toLowerCase();
  const password = process.env.DEFAULT_SUPERADMIN_PASSWORD || "W20121030lov";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email },
      data: { roleId: 4, passwordHash, name: existing.name ?? "Admin" },
    });
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: "Admin",
        points: 0,
        roleId: 4,
      },
    });
  }

  // Seed airports (idempotent upserts)
  const airports = [
    {
      iata: "PEK",
      icao: "ZBAA",
      nameZh: "北京首都國際機場",
      nameEn: "Beijing Capital International Airport",
      city: "北京市",
      province: "北京市",
      country: "中国",
      openedOn: "1958-03-01",
      category: "4F",
      nature: "civil",
      elevationM: 35,
      terminalsJson: JSON.stringify([
        { name: "T2", areaWanSqm: 35.9 },
        { name: "T3C", areaWanSqm: 58.0 },
        { name: "T3D", areaWanSqm: 9.8 },
        { name: "T3E", areaWanSqm: 32.3 },
        { name: "西卫星厅", areaWanSqm: 7.8 },
      ]),
      runwaysJson: JSON.stringify([
        { ident: "01/19", lengthM: 3800, widthM: 60 },
        { ident: "18L/36R", lengthM: 3800, widthM: 60 },
        { ident: "18R/36L", lengthM: 3200, widthM: 50 },
      ]),
      notes:
        "照片/滑行道图片位预留。航站楼面积单位为万㎡；跑道长度单位为米。",
    },
    {
      iata: "PKX",
      icao: "ZBAD",
      nameZh: "北京大興國際機場",
      nameEn: "Beijing Daxing International Airport",
      city: "北京市",
      province: "北京市",
      country: "中国",
      openedOn: "2019-09-25",
      category: "4F",
      nature: "civil",
      elevationM: 25,
      terminalsJson: JSON.stringify([{ name: "T1", areaWanSqm: 78.0 }]),
      runwaysJson: JSON.stringify([
        { ident: "01L/19R", lengthM: 3400, widthM: 60 },
        { ident: "11L/29R", lengthM: 3800, widthM: 60 },
        { ident: "17L/35R", lengthM: 3800, widthM: 60 },
        { ident: "17R/35L", lengthM: 3800, widthM: 45 },
      ]),
      notes: "照片/滑行道图片位预留。",
    },
    {
      iata: "TSN",
      icao: "ZBTJ",
      nameZh: "天津濱海國際機場",
      nameEn: "Tianjin Binhai International Airport",
      city: "天津市",
      province: "天津市",
      country: "中国",
      openedOn: "1950-08-01",
      category: "4E",
      nature: "civil",
      elevationM: 2,
      terminalsJson: JSON.stringify([
        { name: "T1", areaWanSqm: 11.6 },
        { name: "T2", areaWanSqm: 24.8 },
      ]),
      runwaysJson: JSON.stringify([
        { ident: "16L/34R", lengthM: 3200, widthM: 45 },
        { ident: "16R/34L", lengthM: 3600, widthM: 60 },
      ]),
    },
    {
      iata: "SJW",
      icao: "ZBSJ",
      nameZh: "石家莊正定國際機場",
      nameEn: "Shijiazhuang Zhengding International Airport",
      city: "石家庄市",
      province: "河北省",
      country: "中国",
      openedOn: "1995-02-18",
      category: "4E",
      nature: "civil",
      elevationM: 71,
      terminalsJson: JSON.stringify([
        { name: "T1", areaWanSqm: 5.5 },
        { name: "T2", areaWanSqm: 15.4 },
      ]),
      runwaysJson: JSON.stringify([{ ident: "15/33", lengthM: 3400, widthM: 45 }]),
    },
    {
      iata: "ZQZ",
      icao: "ZBZJ",
      nameZh: "張家口寧遠機場",
      nameEn: "Zhangjiakou Ningyuan Airport",
      city: "张家口市",
      province: "河北省",
      country: "中国",
      openedOn: "2013-06-16",
      category: "4C",
      nature: "mixed",
      elevationM: 718,
      terminalsJson: JSON.stringify([{ name: "T2", areaWanSqm: 1.4 }]),
      runwaysJson: JSON.stringify([{ ident: "12/30", lengthM: 3000, widthM: 45 }]),
    },
    {
      iata: "TYN",
      icao: "ZBYN",
      nameZh: "太原武宿國際機場",
      nameEn: "Taiyuan Wusu International Airport",
      city: "太原市",
      province: "山西省",
      country: "中国",
      openedOn: "1971-07-01",
      category: "4E",
      nature: "civil",
      elevationM: 788,
      terminalsJson: JSON.stringify([
        { name: "T1", areaWanSqm: 2.6 },
        { name: "T2", areaWanSqm: 5.5 },
      ]),
      runwaysJson: JSON.stringify([{ ident: "13R/31L", lengthM: 3600, widthM: 45 }]),
    },
    {
      iata: "HET",
      icao: "ZBHH",
      nameZh: "呼和浩特白塔國際機場",
      nameEn: "Hohhot Baita International Airport",
      city: "呼和浩特市",
      province: "内蒙古自治区",
      country: "中国",
      openedOn: "1958-10-01",
      category: "4E",
      nature: "civil",
      elevationM: 1084,
      terminalsJson: JSON.stringify([{ name: "T2", areaWanSqm: 9.6 }]),
      runwaysJson: JSON.stringify([{ ident: "08/26", lengthM: 3600, widthM: 45 }]),
    },
    {
      iata: "SHA",
      icao: "ZSSS",
      nameZh: "上海虹橋國際機場",
      nameEn: "Shanghai Hongqiao International Airport",
      city: "上海市",
      province: "上海市",
      country: "中国",
      openedOn: "1964-04-29",
      category: "4E",
      nature: "civil",
      elevationM: 3,
      terminalsJson: JSON.stringify([
        { name: "T1", areaWanSqm: 12.7 },
        { name: "T2", areaWanSqm: 36.3 },
      ]),
      runwaysJson: JSON.stringify([
        { ident: "18L/36R", lengthM: 3400, widthM: 45 },
        { ident: "18R/36L", lengthM: 3300, widthM: 60 },
      ]),
    },
    {
      iata: "PVG",
      icao: "ZSPD",
      nameZh: "上海浦東國際機場",
      nameEn: "Shanghai Pudong International Airport",
      city: "上海市",
      province: "上海市",
      country: "中国",
      openedOn: "1999-09-16",
      category: "4F",
      nature: "civil",
      elevationM: 4,
      terminalsJson: JSON.stringify([
        { name: "T1", areaWanSqm: 34.0 },
        { name: "T2", areaWanSqm: 54.6 },
        { name: "S1", areaWanSqm: 33.5 },
        { name: "S2", areaWanSqm: 28.7 },
      ]),
      runwaysJson: JSON.stringify([
        { ident: "16L/34R", lengthM: 3800, widthM: 60 },
        { ident: "16R/34L", lengthM: 3800, widthM: 60 },
        { ident: "17L/35R", lengthM: 4000, widthM: 60 },
        { ident: "17R/35L", lengthM: 3400, widthM: 60 },
      ]),
    },
  ];

  for (const a of airports) {
    if (a.iata) {
      await prisma.airport.upsert({
        where: { iata: a.iata },
        create: a,
        update: a,
      });
    } else if (a.icao) {
      await prisma.airport.upsert({
        where: { icao: a.icao },
        create: a,
        update: a,
      });
    }
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

