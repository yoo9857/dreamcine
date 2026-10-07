'use client'

import React from 'react'

import {
  CalendlyCarousel,
  type CarouselItem,
} from '@/components/ui/connected-carousel'

// Demo content stays separate from real creator profiles.
const STORIES_DATA: readonly CarouselItem[] = [
  {
    id: 'studio-prism',
    stat: '140+ design sprints completed',
    quote:
      'Automating client bookings unlocked uninterrupted deep work sessions and transformed our delivery cadence.',
    author: 'Elena Rostova',
    role: 'Head of Product Design at Studio Prism',
    defaultImage:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=640&q=80',
    selectedImage:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=640&q=80',
    alt: 'Portrait used for the Studio Prism demo story',
  },
  {
    id: 'veloce-ai',
    stat: '99.4% client meeting attendance',
    quote:
      'Smart qualification workflows removed manual no-shows completely and gave our sales engineering team its focus back.',
    author: 'Julian Chen',
    role: 'VP of Engineering at Veloce AI',
    defaultImage:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=640&q=80',
    selectedImage:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=640&q=80',
    alt: 'Portrait used for the Veloce AI demo story',
  },
  {
    id: 'hyperion-health',
    stat: '65 hours saved monthly',
    quote:
      'Patients schedule specialty consultations in seconds, giving our clinicians more high-value care time.',
    author: 'Dr. Amara Okafor',
    role: 'Chief Medical Officer at Hyperion Health',
    defaultImage:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=640&q=80',
    selectedImage:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=640&q=80',
    alt: 'Portrait used for the Hyperion Health demo story',
  },
  {
    id: 'aura-craft',
    stat: '$48,000 saved annually',
    quote:
      'Eliminating email tennis accelerated our bespoke customer intake and noticeably elevated our brand impression.',
    author: 'Maya Lindqvist',
    role: 'Creative Director & Founder at Aura Craft',
    defaultImage:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=640&q=80',
    selectedImage:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=640&q=80',
    alt: 'Portrait used for the Aura Craft demo story',
  },
  {
    id: 'echo-labs',
    stat: '82% reduction in coordination overhead',
    quote:
      'Distributed asynchronous scheduling let our remote founders operate seamlessly across twelve timezones.',
    author: 'Siddharth Rao',
    role: 'Co-Founder & COO at Echo Labs',
    defaultImage:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=640&q=80',
    selectedImage:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=640&q=80',
    alt: 'Portrait used for the Echo Labs demo story',
  },
]

export default function CarouselDemo() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#06131a] px-4 py-8">
      <CalendlyCarousel
        items={STORIES_DATA}
        autoPlayInterval={6000}
        pauseOnHover
      />
    </div>
  )
}
