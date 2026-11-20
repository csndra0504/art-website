import { Anchor, Button, Container, Divider, Group, Image, List, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { SeoHead } from '../components/SeoHead';

const CONTACT_EMAIL = 'hello@cassandrawilcoxart.com';
const INSTAGRAM_URL = 'https://instagram.com/casswilcoxart';

const FAIRE_URL = 'https://www.faire.com/brand/b_rcutxzrwjw';

// The matted-print shots from the Faire listings, in /public/images/wholesale.
// Static on purpose: these are product photos, not the retail artwork images
// that Sanity serves, so there's no CMS field to follow. Swap files or add rows
// here to change the preview.
const PREVIEW: { src: string; alt: string }[] = [
	{
		src: '/images/wholesale/iron-city-clock.jpg',
		alt: 'Matted print of an ink and marker drawing of the red Iron City Beer clock sign on the South Side',
	},
	{
		src: '/images/wholesale/heinz-ketchup.jpg',
		alt: 'Matted print of an ink and marker drawing of a Heinz tomato ketchup bottle',
	},
	{
		src: '/images/wholesale/kennywood-dog-and-beer.jpg',
		alt: 'Matted print of an ink and marker drawing of a hot dog with mustard in a paper tray next to a plastic cup of beer',
	},
	{
		src: '/images/wholesale/yellow-bridge.jpg',
		alt: 'Matted print of an ink and marker drawing of a yellow steel arch bridge over a river',
	},
	{
		src: '/images/wholesale/bananas.jpg',
		alt: 'Matted print of an ink and marker drawing of two ripe spotted bananas',
	},
];

const INQUIRY_MAILTO =
	`mailto:${CONTACT_EMAIL}` +
	`?subject=${encodeURIComponent('Wholesale inquiry')}` +
	`&body=${encodeURIComponent(
		'Shop name:\nWebsite or Instagram:\nLocation:\nWhat you\'re interested in:\n',
	)}`;

// Deliberately light on specifics: wholesale pricing, minimums and terms are
// still being worked out. Add them to the "Details" section below as they're
// decided rather than guessing here.
export function Wholesale() {
	return (
		<Container size="md" py="xl">
			<SeoHead
				title="Wholesale | Cassandra Wilcox Art"
				description="Wholesale inquiries for shops, galleries and boutiques interested in carrying Cassandra Wilcox's Pittsburgh ink and marker prints and cards."
				path="/wholesale"
			/>
			<Stack gap="xl">
				<Stack gap="xs">
					<Title order={1}>Wholesale</Title>
					<Title order={2} size="h3" fw={400} fs="italic">
						Hand-Drawn Pittsburgh Art for Your Shop
					</Title>
					<Text mt="xs">
						I'm Cassandra, a Pittsburgh artist drawing the city's buildings and landmarks in fine-line
						ink and marker. If you run a shop, gallery or boutique and want to carry my prints or
						cards, I'd love to hear from you.
					</Text>
					<Group gap="sm" mt="md" wrap="wrap">
						<Button
							component="a"
							href={INQUIRY_MAILTO}
							color="dark"
							radius={0}
							size="md"
						>
							Send a wholesale inquiry
						</Button>
						<Button
							component="a"
							href={FAIRE_URL}
							target="_blank"
							rel="noopener noreferrer"
							variant="outline"
							color="dark"
							radius={0}
							size="md"
						>
							Order on Faire
						</Button>
					</Group>
				</Stack>

				<Divider />

				<Stack gap="sm">
					<Title order={2}>A peek at the line</Title>
					<SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
						{PREVIEW.map((img) => (
							<a
								key={img.src}
								href={FAIRE_URL}
								target="_blank"
								rel="noopener noreferrer"
							>
								<Image
									src={img.src}
									alt={img.alt}
									radius={0}
									loading="lazy"
									h="auto"
									style={{ border: '1px solid #e8e8e0', aspectRatio: '1 / 1', display: 'block' }}
								/>
							</a>
						))}
					</SimpleGrid>
					<Text>
						<Anchor href={FAIRE_URL} target="_blank" rel="noopener noreferrer">
							See the full wholesale catalog on Faire
						</Anchor>
					</Text>
				</Stack>

				<Divider />

				<Stack gap="sm">
					<Title order={2}>How to get started</Title>
					<List type="ordered" spacing="sm">
						<List.Item>
							Browse the line and place an order on Faire, or email me with your shop name,
							location, and a link to your website or Instagram.
						</List.Item>
						<List.Item>
							Tell me which pieces you're interested in, or ask what's available.
						</List.Item>
						<List.Item>
							If you email, I'll reply with wholesale pricing and terms for your order.
						</List.Item>
					</List>
				</Stack>

				<Divider />

				<Stack gap="sm">
					<Title order={2}>Details</Title>
					<Text c="dimmed">
						Wholesale pricing and the full catalog are on Faire. For anything else, or to order outside
						Faire, send me a note and I'll share the current details directly.
					</Text>
				</Stack>

				<Divider />

				<Stack gap="xs">
					<Title order={2}>Contact</Title>
					<Text>
						Email <Anchor href={INQUIRY_MAILTO}>{CONTACT_EMAIL}</Anchor> or DM me on Instagram (
						<Anchor href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
							@casswilcoxart
						</Anchor>
						).
					</Text>
				</Stack>
			</Stack>
		</Container>
	);
}

export const Component = Wholesale;
