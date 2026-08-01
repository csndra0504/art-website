import { useEffect, useRef } from 'react';
import { Anchor, Box, Button, Container, Divider, Group, List, Stack, Text, Title } from '@mantine/core';
import { trackCommissionStarted, trackSectionView } from '../lib/analytics';
import { SeoHead } from '../components/SeoHead';
import { JsonLd } from '../components/JsonLd';
import { buildCommissionsJsonLd } from '../lib/structuredData';
import { CommissionGallery } from '../components/CommissionGallery';
import type { CommissionExample } from '../components/CommissionGallery';
import { Testimonials } from '../components/Testimonials';
import { TESTIMONIALS, ETSY_REVIEW_SUMMARY } from '../lib/siteContent';

// Real past commissions, shown as proof. Images live in /public/images/
// commissions. Captions describe what each drawing depicts (no invented
// stories). Reorder or edit to change the gallery.
const COMMISSIONS: CommissionExample[] = [
	{
		src: '/images/commissions/bryant-street-house.jpg',
		alt: 'Hand-drawn ink and marker portrait of a red-brick Victorian house',
		caption: 'A Victorian home',
	},
	{
		src: '/images/commissions/didi-home.jpg',
		alt: 'Hand-drawn ink and marker portrait of a brick cottage with an arched door and bay window',
		caption: 'A brick cottage',
	},
	{
		src: '/images/commissions/callowhill-house.jpg',
		alt: 'Hand-drawn ink and marker portrait of a three-story Victorian house',
		caption: 'A house',
	},
	{
		src: '/images/commissions/queen-victoria-inn.jpg',
		alt: 'Hand-drawn ink and marker portrait of the Queen Victoria Inn, a green Second Empire Victorian',
		caption: 'The Queen Victoria Inn',
	},
	{
		src: '/images/commissions/taco-bell.jpg',
		alt: 'Hand-drawn ink and marker illustration of a Taco Bell storefront',
		caption: 'A storefront',
	},
	{
		src: '/images/commissions/west-penn-er.jpg',
		alt: 'Hand-drawn ink and marker illustration of the West Penn Hospital emergency entrance and street',
		caption: 'A hospital',
	},
];

// Other pieces from the Pittsburgh series — NOT commissions. Shown to convey
// range and style, under a heading that says so, so nothing is implied to be a
// commission that wasn't.
const OTHER_WORK: CommissionExample[] = [
	{
		src: '/images/commissions/tazza-doro.jpg',
		alt: "Hand-drawn ink and marker illustration of Tazza D'oro coffee shop",
		caption: 'A coffee shop',
	},
	{
		src: '/images/commissions/park-place-pub.jpg',
		alt: 'Hand-drawn ink and marker illustration of Park Place Pub',
		caption: 'A corner bar',
	},
	{
		src: '/images/commissions/thunderbird.jpg',
		alt: 'Hand-drawn ink and marker illustration of the Thunderbird Cafe and Music Hall',
		caption: 'A music hall',
	},
];

const CONTACT_EMAIL = 'hello@cassandrawilcoxart.com';
const INSTAGRAM_URL = 'https://instagram.com/casswilcoxart';

// The existing Notion "Commission Request" form (writes to the Commission Intake
// database). Opened in a new tab from the button below.
const NOTION_FORM_URL = 'https://oval-spur-211.notion.site/21a4263bebe64d9ba2b4313f4adbb825?pvs=105';

// Fire a section_viewed event once, the first time a section scrolls into view.
function useSectionView<T extends HTMLElement>(section: string) {
	const ref = useRef<T>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el || typeof IntersectionObserver === 'undefined') return;
		let fired = false;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting && !fired) {
						fired = true;
						trackSectionView(section);
						observer.disconnect();
					}
				}
			},
			{ threshold: 0.3 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [section]);
	return ref;
}

export function Commissions() {
	const galleryRef = useSectionView<HTMLDivElement>('commission_examples');
	const testimonialsRef = useSectionView<HTMLDivElement>('commission_testimonials');

	const hasTestimonials = TESTIMONIALS.length > 0 || ETSY_REVIEW_SUMMARY != null;

	return (
		<Container size="md" py="xl">
			<SeoHead
				title="Custom Commissions — Cassandra Wilcox Art"
				description="Commission a one-of-a-kind, hand-drawn ink and marker illustration of a place that means something to you (your home, your corner bar, a Pittsburgh landmark). Worked from a photo or on location in Pittsburgh."
				path="/commissions"
			/>
			<JsonLd data={buildCommissionsJsonLd()} />
			<Stack gap="xl">
				{/* Hero */}
				<Stack gap="xs">
					<Title order={1}>Custom Commissions</Title>
					<Title order={2} size="h3" fw={400} fs="italic">
						A Place That Means Something to You, Drawn by Hand
					</Title>
					<Text mt="sm">
						A commission is a custom drawing of a place that matters to you (the house you grew up
						in, your corner bar, the storefront where it all started). Every piece is hand-drawn
						in fine-line ink and alcohol marker, the same style as the Pittsburgh series.
					</Text>
					{/* [Cassandra: drop in a line here in your own voice about why you love
					    drawing people's places, then un-comment this.]
					<Text c="dimmed" fs="italic">...</Text> */}
					<Group gap="sm" mt="md" wrap="wrap">
						<Button
							component="a"
							href={NOTION_FORM_URL}
							target="_blank"
							rel="noopener noreferrer"
							color="dark"
							radius={0}
							size="md"
							onClick={() => trackCommissionStarted({ method: 'hero_button' })}
						>
							Start a commission
						</Button>
						<Button
							variant="outline"
							color="dark"
							radius={0}
							size="md"
							onClick={() =>
								document
									.getElementById('how-it-works')
									?.scrollIntoView({ behavior: 'smooth' })
							}
						>
							How it works
						</Button>
					</Group>
				</Stack>

				<Divider />

				{/* Examples gallery — highest priority, kept near the top. */}
				<Stack gap="xl" ref={galleryRef}>
					<Stack gap="sm">
						<Title order={2}>Recent commissions</Title>
						<Text>
							A few pieces I've drawn for people, from a photo or on location. Homes, a
							storefront, the hospital down the street. Whatever the place, as long as it
							means something to you.
						</Text>
						<Box mt="xs">
							<CommissionGallery examples={COMMISSIONS} />
						</Box>
					</Stack>

					<Stack gap="sm">
						<Title order={3}>More of my work</Title>
						<Text>
							Not commissions, but a sense of the range and style: a few favorites from my
							Pittsburgh series. Yours would be drawn the same way, for your place.
						</Text>
						<Box mt="xs">
							<CommissionGallery examples={OTHER_WORK} />
						</Box>
					</Stack>
				</Stack>

				<Divider />

				{/* How it works — no price, keep the story. */}
				<Stack gap="sm" id="how-it-works" style={{ scrollMarginTop: 16 }}>
					<Title order={2}>How it works</Title>
					<List spacing="sm">
						<List.Item>
							<strong>Priced by the piece.</strong> Each commission is quoted individually,
							based on details like size, complexity, and style. You get the quote after a short
							conversation, so there are no surprises.
						</List.Item>
						<List.Item>
							<strong>From a photo, or on location.</strong> I can work from a photo you send,
							or sketch on location if the place is in the Pittsburgh area. On location I can find
							the best angle and leave out the parked cars and overgrown trees I can't see around
							in a photo, and being there helps me capture the feel of the place. It isn't always
							possible, and photos work well too (the Queen Victoria Inn was drawn entirely from
							one). A photo just needs to be your own, so there's no copyright risk.
						</List.Item>
						<List.Item>
							<strong>What you get.</strong> The original hand-drawn piece plus a
							high-resolution digital file of the finished art. Framing is available if you want
							it.
						</List.Item>
						<List.Item>
							<strong>The process.</strong> Tell me about the place using the button below.
							I'll get back to you within two business days, usually to set up a short phone call
							so we can talk through the details. From there I follow up with any questions, a
							timeline, and a quote. A deposit books your spot, and the rest is due on delivery.
						</List.Item>
						<List.Item>
							<strong>Timing.</strong> Most pieces are finished within thirty days, often
							sooner. On-location drawings can take a little longer, since they wait on good
							weather.
						</List.Item>
					</List>
				</Stack>

				{/* Testimonials — CMS/content-driven, auto-hides while empty so nothing
				    fabricated ever ships. Only render (and track) when there's content. */}
				{hasTestimonials && (
					<>
						<Divider />
						<Box ref={testimonialsRef}>
							<Testimonials heading="What people say" />
						</Box>
					</>
				)}

				<Divider />

				{/* The ask — a button to the Notion commission form. */}
				<Stack gap="sm" align="flex-start">
					<Title order={2}>Start your commission</Title>
					<Text>
						Tell me about the place and I'll take it from there. The form goes straight to
						me, and I read every one.
					</Text>
					<Button
						component="a"
						href={NOTION_FORM_URL}
						target="_blank"
						rel="noopener noreferrer"
						color="dark"
						radius={0}
						size="md"
						mt="xs"
						onClick={() => trackCommissionStarted({ method: 'form_button' })}
					>
						Tell me about your place
					</Button>
					<Text size="sm" c="dimmed" mt="xs">
						Questions first? DM me on Instagram (
						<Anchor href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
							@casswilcoxart
						</Anchor>
						) or email <Anchor href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Anchor>.
					</Text>
				</Stack>
			</Stack>
		</Container>
	);
}

export const Component = Commissions;
