import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const users = [
  {
    id: 'seed_user_creator_01',
    handle: 'dream_director',
    email: 'director@ilog.info',
    displayName: 'Dream Director',
    role: 'CREATOR' as const,
  },
  {
    id: 'seed_user_creator_02',
    handle: 'pixel_storyteller',
    email: 'storyteller@ilog.info',
    displayName: 'Pixel Storyteller',
    role: 'CREATOR' as const,
  },
  {
    id: 'seed_user_viewer_01',
    handle: 'first_audience',
    email: 'audience@ilog.info',
    displayName: 'First Audience',
    role: 'VIEWER' as const,
  },
] as const

const series = [
  {
    id: 'seed_series_neon_01',
    ownerId: users[0].id,
    slug: 'neon-after-rain',
    title: '비가 그친 뒤의 네온',
    synopsis: '기억을 영상으로 복원하는 도시의 마지막 기록관 이야기.',
  },
  {
    id: 'seed_series_orbit_01',
    ownerId: users[1].id,
    slug: 'small-orbit',
    title: '아주 작은 궤도',
    synopsis: '폐쇄된 우주 정거장에서 시작되는 여섯 개의 짧은 선택.',
  },
] as const

const publishedAt = new Date('2026-08-21T00:00:00.000Z')

async function main(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const user of users) {
      await tx.user.upsert({
        where: { id: user.id },
        create: user,
        update: {
          handle: user.handle,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          deletedAt: null,
        },
      })
    }

    for (const item of series) {
      await tx.series.upsert({
        where: { id: item.id },
        create: { ...item, episodeCount: 3 },
        update: {
          ownerId: item.ownerId,
          slug: item.slug,
          title: item.title,
          synopsis: item.synopsis,
          episodeCount: 3,
          deletedAt: null,
        },
      })
    }

    for (const [seriesIndex, item] of series.entries()) {
      for (let number = 1; number <= 3; number += 1) {
        const id = `seed_episode_${String(seriesIndex + 1)}_${String(number)}`
        await tx.episode.upsert({
          where: { id },
          create: {
            id,
            seriesId: item.id,
            number,
            title: `${item.title} ${String(number)}화`,
            description: '개발·스테이징 연결 검증용 공개 에피소드입니다.',
            status: 'PUBLISHED',
            publishedAt,
            rankScore: 100 - seriesIndex * 10 - number,
          },
          update: {
            seriesId: item.id,
            number,
            title: `${item.title} ${String(number)}화`,
            status: 'PUBLISHED',
            publishedAt,
            deletedAt: null,
          },
        })
      }
    }

    await tx.user.update({
      where: { id: users[0].id },
      data: { seriesCount: 1 },
    })
    await tx.user.update({
      where: { id: users[1].id },
      data: { seriesCount: 1 },
    })
  })
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    )
    await prisma.$disconnect()
    process.exitCode = 1
  })
