import {
	Anchor,
	Button,
	Container,
	Divider,
	Group,
	Image,
	List,
	Stack,
	Text,
	Title,
} from '@mantine/core';
import { useDocumentTitle } from '@mantine/hooks';
import { trackLead } from '../lib/analytics';

const CONTACT_EMAIL = 'hello@cassandrawilcoxart.com';
const INSTAGRAM_URL = 'https://instagram.com/casswilcoxart';
const FORM_URL = 'https://oval-spur-211.notion.site/99604deef63e410b94f682c3aac0d6f2?pvs=105';

export function Commissions() {
	useDocumentTitle('Custom Commissions — Cassandra Wilcox Art');
	return (
		<Container size="md" py="xl">
			<Stack gap="xl">
				{/* Hero */}
				<Group align="flex-start" gap="xl" wrap="wrap">
					<Stack gap="md" style={{ flex: 1, minWidth: 280 }}>
						<Stack gap="xs">
							<Title order={1}>Custom Commissions</Title>
							<Title order={2} size="h3" fw={400} fs="italic">
								A Place That Means Something to You, Drawn by Hand
							</Title>
						</Stack>

						<Text>
							Every building tells a story. Maybe it's the bar where you had your first date,
							the house your grandparents built, or the restaurant where your whole family
							gathers on Sundays. I turn those places into one-of-a-kind, hand-drawn artwork you
							can keep forever.
						</Text>

						<Text>
							I work in fine line ink and alcohol markers — the same style you see in my
							Pittsburgh series — but for <em>your</em> place, <em>your</em> story.
						</Text>
					</Stack>

					<Image
						src="/images/bryant_house_8x10.jpg"
						alt="Example commission — hand-drawn ink and marker illustration of a brick building"
						radius="sm"
						style={{
							width: 'auto',
							maxWidth: 340,
							flexShrink: 0,
							boxShadow: 'var(--mantine-shadow-sm)',
						}}
					/>
				</Group>

				<Divider />

				{/* What You Get */}
				<Stack gap="sm">
					<Title order={2}>What You Get</Title>
					<List spacing="sm">
						<List.Item>
							<strong>An original, hand-drawn piece</strong> — not a print, not digital. The
							actual artwork, drawn by my hand, on paper.
						</List.Item>
						<List.Item>
							<strong>A high-resolution digital file</strong> of the finished piece, so you can
							print copies for family, use it in holiday cards, or just keep a backup.
						</List.Item>
						<List.Item>
							<strong>My full attention to the details that make your place yours</strong> — the
							crooked mailbox, the neon sign, the way the light hits the front porch.
						</List.Item>
					</List>
				</Stack>

				<Divider />

				{/* Pricing */}
				<Stack gap="sm">
					<Title order={2}>Pricing</Title>
					<Text>
						<strong>$100-$400</strong> for a custom commission.
					</Text>
					<Text>
						This includes the original artwork and a digital file. Framing is available at an
						additional cost — just ask and I'll walk you through options.
					</Text>
				</Stack>

				<Divider />

				{/* How It Works */}
				<Stack gap="md">
					<Title order={2}>How It Works</Title>

					<Stack gap="xs">
						<Title order={3}>1. Complete the Form</Title>
						<Text>
							Fill out my{' '}
							<Anchor
								href={FORM_URL}
								target="_blank"
								onClick={() => trackLead('commission_inquiry', { method: 'form' })}
							>
								commission inquiry form
							</Anchor>
							. It walks you through everything I need to get started, including:
						</Text>
						<List spacing="xs">
							<List.Item>What place you'd like drawn</List.Item>
							<List.Item>
								Whether you'd prefer I work from a photo or visit on-location (Pittsburgh
								area)
							</List.Item>
							<List.Item>
								Any details that matter to you — a specific angle, season, time of day, or
								vibe
							</List.Item>
							<List.Item>
								Your ideal size (I'll help you figure this out if you're not sure)
							</List.Item>
						</List>
					</Stack>

					<Stack gap="xs">
						<Title order={3}>2. I'll Send You a Proposal</Title>
						<Text>
							Within a few days, I'll reply with a sketch concept, timeline, and final quote. No
							surprises.
						</Text>
					</Stack>

					<Stack gap="xs">
						<Title order={3}>3. Deposit & Start</Title>
						<Text>
							Once you're happy with the plan, I'll send an invoice for a{' '}
							<strong>50% deposit</strong>. That locks in your spot.
						</Text>
					</Stack>

					<Stack gap="xs">
						<Title order={3}>4. Delivery</Title>
						<Text>
							The finished piece is typically ready in <strong>2–3 weeks</strong> from your
							deposit. I'll send you a photo of the final artwork for approval, then ship it (or
							arrange local pickup in Pittsburgh) along with your digital file.
						</Text>
						<Text>
							<strong>The remaining 50% is due upon delivery.</strong>
						</Text>
					</Stack>
				</Stack>

				<Divider />

				{/* A Few Things to Know */}
				<Stack gap="sm">
					<Title order={2}>A Few Things to Know</Title>
					<List spacing="xs">
						<List.Item>
							I currently take <strong>2–3 commissions at a time</strong> so I can give each
							piece the attention it deserves. If my slots are full, I'll let you know the next
							available window.
						</List.Item>
						<List.Item>
							I'm happy to work from photos you send or from reference images if on-location
							isn't possible.
						</List.Item>
						<List.Item>
							If you're buying this as a gift, I can coordinate timing and keep things under
							wraps.
						</List.Item>
						<List.Item>
							Not sure if your idea is a fit? Just ask. I'm happy to chat about it — no
							commitment, no pressure.
						</List.Item>
					</List>
				</Stack>

				<Divider />

				{/* Ready? */}
				<Stack gap="sm" align="flex-start">
					<Title order={2}>Ready?</Title>
					<Text>
						Complete the commission inquiry form and tell me about your place. I'd love to hear
						the story.
					</Text>
					<Button
						component="a"
						href={FORM_URL}
						target="_blank"
						onClick={() => trackLead('commission_inquiry', { method: 'form' })}
						size="md"
					>
						Start your commission
					</Button>
					<Text size="sm" c="dimmed">
						Questions first? DM me on Instagram (
						<Anchor href={INSTAGRAM_URL} target="_blank">
							@casswilcoxart
						</Anchor>
						) or email {CONTACT_EMAIL}.
					</Text>
				</Stack>
			</Stack>
		</Container>
	);
}
