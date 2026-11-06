import { Anchor, Button, Container, Divider, Group, List, Stack, Text, Title } from '@mantine/core';
import { SeoHead } from '../components/SeoHead';

const CONTACT_EMAIL = 'hello@cassandrawilcoxart.com';
const INSTAGRAM_URL = 'https://instagram.com/casswilcoxart';

// Set to the Faire storefront URL once the account is approved; the Faire
// section and button appear automatically. Leave null until then so we never
// link to a page that doesn't exist.
const FAIRE_URL: string | null = null;

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
						{FAIRE_URL && (
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
						)}
					</Group>
				</Stack>

				<Divider />

				<Stack gap="sm">
					<Title order={2}>How to get started</Title>
					<List type="ordered" spacing="sm">
						<List.Item>
							Email me with your shop name, location, and a link to your website or Instagram.
						</List.Item>
						<List.Item>
							Tell me which pieces you're interested in, or ask what's available.
						</List.Item>
						<List.Item>
							I'll reply with wholesale pricing and terms for your order.
						</List.Item>
					</List>
				</Stack>

				<Divider />

				<Stack gap="sm">
					<Title order={2}>Details</Title>
					<Text c="dimmed">
						Wholesale pricing, minimums, and a full catalog are coming soon. In the meantime, send me
						a note and I'll share the current details directly.
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
