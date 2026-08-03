import { Box, Container, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { SeoHead } from '../components/SeoHead';

type Postcard = {
	name: string;
	slug: string;
};

// One-off static assets served from /public/images/postcards. Note the folder is
// deliberately NOT /public/postcards — that would collide with the SPA route and
// make nginx's `try_files $uri/` resolve the directory (403) instead of falling
// back to index.html. (See the raffle page for the same gotcha.)
//
// This is the "pick your free postcard" page reached from the door-hanger
// commissions sign-up confirmation email. Someone scans the QR code on the door
// hanger, joins the email list, and gets a free 5×7 postcard as a thank-you.
// They reply to that email with the design they want plus their mailing address.
//
// Each entry needs a matching /public/images/postcards/<slug>.webp file. Add,
// remove, and reorder entries here as designs come and go.
const POSTCARDS: Postcard[] = [
	// A handful of favorites are hand-ordered up front; everything after these
	// five follows alphabetically.
	{ name: "Tazza D'oro", slug: 'tazza-doro' },
	{ name: 'Park Place Pub', slug: 'park-place-pub' },
	{ name: 'Bryant Street Market', slug: 'bryant-street-market' },
	{ name: 'Highland Park Houses', slug: 'highland-park-houses' },
	{ name: 'Highland Park Fountain', slug: 'highland-park-fountain' },
	{ name: '16th Street Bridge', slug: '16th-street-bridge' },
	{ name: 'Bananas', slug: 'bananas' },
	{ name: "Biddle's Escape", slug: 'biddles-escape' },
	{ name: 'Dippy the Dino', slug: 'dippy-the-dino' },
	{ name: 'Heinz Ketchup', slug: 'heinz-ketchup' },
	{ name: 'Hill Houses (Millvale)', slug: 'hill-houses-millvale' },
	{ name: 'Iron City Clock', slug: 'iron-city-clock' },
	{ name: 'Kaibur Coffee (Polish Hill)', slug: 'kaibur-coffee' },
	{ name: 'Kennywood Dog & Old German Beer', slug: 'kennywood-dog-and-old-german-beer' },
	{ name: "Max's Allegheny Tavern", slug: 'maxs-allegheny-tavern' },
	{ name: 'Mr. Smalls', slug: 'mr-smalls' },
	{ name: 'Rainbow Chairs (East End Brewing)', slug: 'rainbow-chairs' },
	{ name: 'Rock Room (Polish Hill)', slug: 'rock-room' },
	{ name: 'Skyline View from North Shore', slug: 'north-shore-skyline' },
	{ name: 'Titty Sphinx', slug: 'titty-sphinx' },
];

export function FreePostcard() {
	return (
		<Container size="lg" py="xl">
			<SeoHead
				title="Your Free Postcard — Pick a Design"
				description="Thanks for signing up! Pick any one 5×7 hand-drawn postcard from the designs below and reply to the confirmation email with your choice and mailing address."
				path="/free-postcard"
				// Reached only from the sign-up confirmation email — not something
				// that should turn up in search results.
				noindex
			/>
			<Stack gap="xl">
				<Stack gap="md">
					<Title order={1} c="black">
						Your Free Postcard — Pick a Design
					</Title>
					<Text c="black">
						Thanks for signing up! As a thank-you, you've got your pick of any one
						5×7 hand-drawn postcard below. Take your time browsing the designs, then
						reply to your confirmation email with the name of the postcard you'd like
						and your mailing address. I'll pop it in the mail (or hand-deliver it).
					</Text>
				</Stack>

				<SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl" verticalSpacing="xl">
					{POSTCARDS.map((postcard) => (
						<Stack key={postcard.slug} gap="sm" align="stretch">
							<Box
								style={{
									// Fixed height so every thumbnail reads the same size
									// regardless of the source scan's exact proportions.
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
									src={`/images/postcards/${postcard.slug}.webp`}
									alt={`${postcard.name} — 5×7 hand-drawn ink and marker postcard by Cassandra Wilcox`}
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
								{postcard.name}
							</Text>
						</Stack>
					))}
				</SimpleGrid>
			</Stack>
		</Container>
	);
}

export const Component = FreePostcard;
