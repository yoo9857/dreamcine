import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const users = [
  {
    id: 'seed_user_creator_01',
    handle: 'dream_director',
    email: 'director@ilog.info',
    displayName: 'Dream Director',
    avatarKey: null,
    bio: null,
    channelDescription: null,
    channelKeywords: [],
    role: 'CREATOR' as const,
  },
  {
    id: 'seed_user_creator_02',
    handle: 'pixel_storyteller',
    email: 'storyteller@ilog.info',
    displayName: 'Pixel Storyteller',
    avatarKey: null,
    bio: null,
    channelDescription: null,
    channelKeywords: [],
    role: 'CREATOR' as const,
  },
  {
    id: 'seed_user_writer_01',
    handle: 'system_writer_01',
    email: 'system.writer.01@ilog.info',
    displayName: '시스템 작가 1',
    avatarKey: 'brand/profiles/system-writer-01.png',
    bio: '도시의 빛과 사람 사이의 작은 감정을 포착해, 짧지만 오래 남는 이야기를 씁니다.',
    channelDescription:
      '현실과 상상 사이의 경계에서 캐릭터 중심의 시네마틱 스토리를 만듭니다.',
    channelKeywords: ['감성', '도시', '캐릭터', '시네마틱'],
    role: 'CREATOR' as const,
  },
  {
    id: 'seed_user_writer_02',
    handle: 'system_writer_02',
    email: 'system.writer.02@ilog.info',
    displayName: '시스템 작가 2',
    avatarKey: 'brand/profiles/system-writer-02.png',
    bio: '복잡한 세계관 속에서도 결국 사람을 움직이는 선택과 관계를 탐구합니다.',
    channelDescription:
      'SF와 미스터리 장르를 바탕으로 질문을 남기는 이야기를 선보입니다.',
    channelKeywords: ['SF', '미스터리', '세계관', '관계'],
    role: 'CREATOR' as const,
  },
  {
    id: 'seed_user_writer_03',
    handle: 'system_writer_03',
    email: 'system.writer.03@ilog.info',
    displayName: '시스템 작가 3',
    avatarKey: 'brand/profiles/system-writer-03.png',
    bio: '유쾌한 리듬과 선명한 대사로 오늘의 우리를 조금 다르게 바라봅니다.',
    channelDescription:
      '일상에서 출발한 따뜻한 코미디와 성장 이야기를 만듭니다.',
    channelKeywords: ['코미디', '성장', '일상', '대사'],
    role: 'CREATOR' as const,
  },
  {
    id: 'seed_user_writer_04',
    handle: 'system_writer_04',
    email: 'system.writer.04@ilog.info',
    displayName: '시스템 작가 4',
    avatarKey: 'brand/profiles/system-writer-04.png',
    bio: '장르의 규칙을 비틀고, 익숙한 장면에 낯선 감각을 더하는 실험적인 작가입니다.',
    channelDescription:
      '초현실적 이미지와 다층적인 서사로 새로운 시청 경험을 설계합니다.',
    channelKeywords: ['실험', '초현실', '예술', '서사'],
    role: 'CREATOR' as const,
  },
  {
    id: 'seed_user_writer_05',
    handle: 'system_writer_05',
    email: 'system.writer.05@ilog.info',
    displayName: '시스템 작가 5',
    avatarKey: 'brand/profiles/system-writer-05.png',
    bio: '시간이 지나도 다시 꺼내 보고 싶은, 깊이 있는 인물 이야기를 지향합니다.',
    channelDescription:
      '삶의 전환점과 기억을 섬세하게 다루는 휴먼 드라마를 만듭니다.',
    channelKeywords: ['휴먼드라마', '기억', '인물', '가족'],
    role: 'CREATOR' as const,
  },
  {
    id: 'seed_user_viewer_01',
    handle: 'first_audience',
    email: 'audience@ilog.info',
    displayName: 'First Audience',
    avatarKey: null,
    bio: null,
    channelDescription: null,
    channelKeywords: [],
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
        create: { ...user, channelKeywords: [...user.channelKeywords] },
        update: {
          handle: user.handle,
          email: user.email,
          displayName: user.displayName,
          avatarKey: user.avatarKey ?? null,
          bio: user.bio ?? null,
          channelDescription: user.channelDescription ?? null,
          channelKeywords: [...user.channelKeywords],
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
