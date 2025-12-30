import { getGameLevels } from '@/lib/api';
import { getGames } from '@/lib/api';
import LevelSelectionClient from '@/components/LevelSelectionClient';
import { notFound } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

interface PageProps {
  params: Promise<{ gameId: string }>;
}

export default async function LevelSelectionPage({ params }: PageProps) {
  const { gameId } = await params;

  try {
    // Load game levels (server-side)
    const levels = await getGameLevels(gameId);
    
    // Load game info (server-side)
    const games = await getGames();
    const game = games.find(g => g.gameId === gameId);

    if (!game) {
      notFound();
    }

    return (
      <>
        <LevelSelectionClient 
          gameId={gameId}
          levels={levels}
          game={game}
        />
        <BottomNav active='all' />
      </>
    );
  } catch (error) {
    console.error('Error loading level data:', error);
    notFound();
  }
}
