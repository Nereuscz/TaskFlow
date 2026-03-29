import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  const password = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "samuel@example.com" },
    update: {},
    create: {
      name: "Samuel",
      email: "samuel@example.com",
      password,
    },
  });

  let workspace = await prisma.workspace.findFirst({
    where: { slug: "my-projects" },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: "My Projects",
        slug: "my-projects",
        users: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
    });
  }

  const project = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1",
      name: "Hyrox Training",
      color: "#6366f1",
      workspaceId: workspace.id,
      columns: {
        create: [
          { name: "To Do", order: 1000 },
          { name: "In Progress", order: 2000 },
          { name: "In Review", order: 3000 },
          { name: "Done", order: 4000 },
        ],
      },
    },
    include: { columns: true },
  });

  const todoColumn = project.columns.find((c) => c.name === "To Do")!;
  const inProgressColumn = project.columns.find((c) => c.name === "In Progress")!;

  await prisma.task.createMany({
    data: [
      {
        title: "Plan weekly training schedule",
        columnId: todoColumn.id,
        projectId: project.id,
        createdById: user.id,
        priority: "HIGH",
        order: 1000,
      },
      {
        title: "10km run - tempo pace",
        columnId: inProgressColumn.id,
        projectId: project.id,
        createdById: user.id,
        priority: "MEDIUM",
        order: 1000,
      },
      {
        title: "Sled push workout",
        columnId: todoColumn.id,
        projectId: project.id,
        createdById: user.id,
        priority: "MEDIUM",
        order: 2000,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Seed complete!");
  console.log(`   Email: samuel@example.com`);
  console.log(`   Password: password123`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
