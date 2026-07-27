import { Box, Container, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { SeoHead } from '../components/SeoHead';

type Print = {
	name: string;
	slug: string;
};

// One-off static assets served from /public/images/raffle. Note the folder is
// deliberately NOT /public/raffle — that would collide with the /raffle SPA
// route and make nginx's `try_files $uri/` resolve the directory (403) instead
// of falling back to index.html.
//
// This is a single, evergreen "pick your print" page reached from the raffle
// email (any market). Add/remove entries here as prints come and go. The most
// popular prints are hand-ordered up front; the rest follow alphabetically.
const PRINTS: Print[] = [
	{ name: 'Thunderbird Café', slug: 'thunderbird-cafe' },
	{ name: "Max's Allegheny Tavern", slug: 'maxs-allegheny-tavern' },
	{ name: 'PGH Skyline from North Shore', slug: 'north-shore-skyline' },
	{ name: "Tazza D'oro", slug: 'tazza-doro' },
	{ name: 'Park Place Pub', slug: 'park-place-pub' },
	{ name: 'Dippy the Dino', slug: 'dippy-the-dino' },
	{ name: "Biddle's Escape", slug: 'biddles-escape' },
	{ name: 'Bryant Street Market', slug: 'bryant-street-market' },
	{ name: 'Coffee Tree (Dormont)', slug: 'coffee-tree' },
	{ name: 'Highland Park Houses', slug: 'highland-park-houses' },
	{ name: 'Jean-Marc Chatellier', slug: 'jean-marc-chatellier' },
	{ name: 'Kaibur Coffee', slug: 'kaibur-coffee' },
	{ name: 'Mr. Smalls', slug: 'mr-smalls' },
	{ name: 'Row House Cinema', slug: 'row-house-cinema' },
	{ name: 'Starlight Lounge', slug: 'starlight-lounge' },
];

export function Raffle() {
	return (
		<Container size="lg" py="xl">
			<SeoHead
				title="Email Raffle — Pick Your Print"
				description="Raffle winners: pick any one 8×10 hand-drawn print from the options below."
				path="/raffle"
				// One-off page for raffle winners reached from an email — not
				// something that should turn up in search results.
				noindex
			/>
			<Stack gap="xl">
				<Stack gap="md">
					<Title order={1} c="black">
						Email Raffle — Pick Your Print
					</Title>
					<Text c="black">
						Congratulations — you won! You've got your pick of any one 8×10 print below.
						Take your time browsing the options, then reply to the raffle email with the
						name of the print you'd like. I'll get it signed and on its way to you.
					</Text>
				</Stack>

				<SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl" verticalSpacing="xl">
					{PRINTS.map((print) => (
						<Stack key={print.slug} gap="sm" align="stretch">
							<Box
								style={{
									// Fixed height so every thumbnail reads the same size
									// regardless of whether the source is a portrait scan or a
									// landscape product photo — otherwise the tall scans
									// visually tower over the framed shots.
									height: 'clamp(220px, 55vw, 300px)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									backgroundColor: '#ffffff',
									border: '1px solid #eaeaea',
									padding: 8,
								}}
							>
								<img
									src={`/images/raffle/${print.slug}.webp`}
									alt={`${print.name} — 8×10 hand-drawn ink and marker print by Cassandra Wilcox`}
									loading="lazy"
									style={{
										maxWidth: '100%',
										maxHeight: '100%',
										width: 'auto',
										height: 'auto',
										objectFit: 'contain',
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

export const Component = Raffle;
