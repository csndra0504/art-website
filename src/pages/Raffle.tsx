import { Box, Container, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useDocumentTitle } from '@mantine/hooks';

type Print = {
	name: string;
	slug: string;
};

// One-off static assets served from /public/raffle — see the raffle prompt.
const PRINTS: Print[] = [
	{ name: "Biddle's Escape", slug: 'biddles-escape' },
	{ name: 'Bryant Street Market', slug: 'bryant-street-market' },
	{ name: 'Coffee Tree (Dormont)', slug: 'coffee-tree' },
	{ name: 'Dippy the Dino', slug: 'dippy-the-dino' },
	{ name: 'Highland Park Houses', slug: 'highland-park-houses' },
	{ name: 'Jean-Marc Chatellier', slug: 'jean-marc-chatellier' },
	{ name: 'Kaibur Coffee', slug: 'kaibur-coffee' },
	{ name: 'Mr. Smalls', slug: 'mr-smalls' },
	{ name: 'Park Place Pub', slug: 'park-place-pub' },
	{ name: 'Row House Cinema', slug: 'row-house-cinema' },
	{ name: 'Starlight Lounge', slug: 'starlight-lounge' },
	{ name: "Tazza D'oro", slug: 'tazza-doro' },
];

export function Raffle() {
	useDocumentTitle('Northside Music Fest Raffle — Pick Your Print');

	return (
		<Container size="lg" py="xl">
			<Stack gap="xl">
				<Stack gap="md">
					<Title order={1} c="black">
						Northside Music Fest Raffle — Pick Your Print
					</Title>
					<Text c="black">
						Congratulations — you won! You've got your pick of any one 8×10 print below.
						Take your time browsing the twelve options, then reply to the raffle email
						with the name of the print you'd like. I'll get it signed and on its way to you.
					</Text>
				</Stack>

				<SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl" verticalSpacing="xl">
					{PRINTS.map((print) => (
						<Stack key={print.slug} gap="sm" align="stretch">
							<Box
								style={{
									aspectRatio: '1 / 1',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									backgroundColor: '#ffffff',
								}}
							>
								<img
									src={`/raffle/${print.slug}.webp`}
									alt={`${print.name} — 8×10 hand-drawn ink and marker print by Cassandra Wilcox`}
									loading="lazy"
									style={{
										maxWidth: '100%',
										maxHeight: '100%',
										width: 'auto',
										height: 'auto',
										display: 'block',
									}}
								/>
							</Box>
							<Text fw={500} c="black" ta="left">
								{print.name}
							</Text>
						</Stack>
					))}
				</SimpleGrid>
			</Stack>
		</Container>
	);
}
