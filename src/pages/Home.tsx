import { useEffect, useMemo, useState } from 'react';
import { usePostHog } from '@posthog/react';
import {
	Anchor,
	Badge,
	Box,
	Button,
	Container,
	Divider,
	Group,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from '@mantine/core';
import { useLoaderData } from 'react-router-dom';
import { getArtworks } from '../lib/queries';
import { ArtworkCard } from '../components/ArtworkCard';
import { EventBanner } from '../components/EventBanner';
import { EmailSignupBanner } from '../components/EmailSignupBanner';
import { SeoHead } from '../components/SeoHead';
import { JsonLd } from '../components/JsonLd';
import { buildHomeJsonLd } from '../lib/structuredData';
import type { ArtworkSummary } from '../types/artwork';

// Runs at build time (and on client navigation) so the gallery is present in the
// static HTML for crawlers.
export async function loader() {
	return { artworks: await getArtworks() };
}

// A piece is "available" if it's for sale and at least one purchase path is open.
function isAvailable(a: ArtworkSummary): boolean {
	if (!a.forSale) return false;
	if (a.originalPrice != null && !a.originalSold) return true;
	if (a.printEtsyPrice != null) return true;
	if (a.printLocalPrice != null && !a.printLocalSold) return true;
	if (a.hasCustomOption) return true;
	return false;
}

function scrollToGallery() {
	document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' });
}

// Small price-tag glyph for the "For Sale" filter. Inline SVG keeps us from
// pulling in an icon dependency; it inherits the badge text color.
function TagIcon() {
	return (
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			style={{ display: 'block' }}
		>
			<path d="M7.5 7.5h.01" />
			<path d="M3 6v5.172a2 2 0 0 0 .586 1.414l7.414 7.414a2 2 0 0 0 2.828 0l4.586-4.586a2 2 0 0 0 0-2.828L11 5.586A2 2 0 0 0 9.586 5H4a1 1 0 0 0-1 1z" />
		</svg>
	);
}

export function Home() {
	const posthog = usePostHog();
	// Seed from the build-time loader (present in static HTML), then refetch on
	// the client so new work / sold status updates without waiting for a rebuild.
	// Loader data is null for any path the build didn't prerender, so read it
	// defensively — a stale manifest must not blank the page.
	const loaderData = useLoaderData() as {
		artworks: ArtworkSummary[];
	} | null;
	const [artworks, setArtworks] = useState<ArtworkSummary[]>(
		loaderData?.artworks ?? [],
	);
	const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
	const [availableOnly, setAvailableOnly] = useState(false);

	useEffect(() => {
		getArtworks()
			.then(setArtworks)
			.catch(() => {});
	}, []);

	// Collapse tags case-insensitively, keeping the first-seen casing as the
	// display label so "Pittsburgh" and "pittsburgh" share one filter.
	const allTags = useMemo(() => {
		const tagMap = new Map<string, string>();
		for (const artwork of artworks) {
			artwork.tags?.forEach((t) => {
				const key = t.toLowerCase();
				if (!tagMap.has(key)) tagMap.set(key, t);
			});
		}
		return Array.from(tagMap.values()).sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: 'base' }),
		);
	}, [artworks]);

	const availableCount = useMemo(() => artworks.filter(isAvailable).length, [artworks]);

	// activeTags holds lowercased tag keys for case-insensitive matching.
	const toggleTag = (tag: string) => {
		const key = tag.toLowerCase();
		setActiveTags((prev) => {
			const next = new Set(prev);
			const adding = !next.has(key);
			if (adding) {
				next.add(key);
			} else {
				next.delete(key);
			}
			posthog?.capture('gallery_filter_applied', { filter_type: 'tag', filter_value: tag, applied: adding });
			return next;
		});
	};

	const filtered = artworks.filter((a) => {
		if (availableOnly && !isAvailable(a)) return false;
		if (activeTags.size === 0) return true;
		const tags = a.tags?.map((t) => t.toLowerCase()) ?? [];
		return [...activeTags].every((t) => tags.includes(t));
	});

	const seo = (
		<>
			<SeoHead
				title="Cassandra Wilcox Art — Original Pittsburgh Art & Prints"
				description="Hand-drawn originals and prints of Pittsburgh's landmarks and main-street neighborhoods — Lawrenceville, Polish Hill, the South Side, and beyond. By Pittsburgh sketch artist Cassandra Wilcox."
				path="/"
			/>
			<JsonLd data={buildHomeJsonLd()} />
		</>
	);

	if (artworks.length === 0) {
		return (
			<Container size="lg" py="xl">
				{seo}
				<Text c="dimmed">No artworks yet.</Text>
			</Container>
		);
	}

	return (
		<>
			{seo}
			<EmailSignupBanner />
			<EventBanner />
			<Container size="lg">
				{/* Hero — lead with the work and a clear path to buy. */}
				<Stack align="center" py={48} gap="md">
					<Title order={1} ta="center" fw={700} style={{ letterSpacing: '-0.02em' }}>
						Art That Celebrates Main Street Pittsburgh
					</Title>
					<Title order={2} ta="center" fw={400} c="dimmed" size="lg">
						Cassandra Wilcox &middot; Pittsburgh-based Sketch Artist
					</Title>
					<Text ta="center" size="sm" style={{ lineHeight: 1.7, maxWidth: 580 }}>
						Hand-drawn originals and prints of the landmarks and main-street spots that make
						Pittsburgh feel like home. Featuring neighborhoods from Highland Park and Millvale, to
						Lawrenceville and Polish Hill, South Side, and North Side among others!
					</Text>
					<Group gap="md" mt="sm" justify="center" wrap="wrap">
						<Button
							onClick={() => {
								scrollToGallery();
								posthog?.capture('hero_cta_clicked', { cta_label: 'shop_gallery' });
							}}
							color="dark"
							radius={0}
							size="md"
							px="xl"
						>
							Shop Originals &amp; Prints
						</Button>
						<Button
							component="a"
							href="/commissions"
							variant="outline"
							color="dark"
							radius={0}
							size="md"
							px="xl"
							onClick={() => posthog?.capture('hero_cta_clicked', { cta_label: 'commissions' })}
						>
							Commission a Piece
						</Button>
					</Group>
				</Stack>

				<Divider id="gallery" mb="lg" />

				{/* Filters: All, then For Sale, then tags. */}
				<Group gap="xs" mb="lg">
					<Badge
						variant={activeTags.size === 0 && !availableOnly ? 'filled' : 'outline'}
						color="dark"
						radius={0}
						size="md"
						style={{ cursor: 'pointer' }}
						onClick={() => {
							setActiveTags(new Set());
							setAvailableOnly(false);
						}}
					>
						All
					</Badge>
					{availableCount > 0 && (
						<Badge
							variant={availableOnly ? 'filled' : 'outline'}
							color="dark"
							radius={0}
							size="md"
							leftSection={<TagIcon />}
							style={{ cursor: 'pointer' }}
							onClick={() => {
								const next = !availableOnly;
								setAvailableOnly(next);
								posthog?.capture('gallery_filter_applied', { filter_type: 'for_sale', applied: next });
							}}
						>
							For Sale
						</Badge>
					)}
					{allTags.length > 0 && (
						<>
							{allTags.map((tag) => (
								<Badge
									key={tag}
									variant={activeTags.has(tag.toLowerCase()) ? 'filled' : 'outline'}
									color="dark"
									radius={0}
									size="md"
									style={{ cursor: 'pointer' }}
									onClick={() => toggleTag(tag)}
								>
									{tag}
								</Badge>
							))}
						</>
					)}
				</Group>

				{filtered.length === 0 ? (
					<Text c="dimmed" py="xl" ta="center">
						Nothing matches that filter yet. Try clearing it.
					</Text>
				) : (
					<SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="lg">
						{filtered.map((artwork) => (
							<ArtworkCard key={artwork._id} artwork={artwork} />
						))}
					</SimpleGrid>
				)}

				{/* About — moved below the work so the hero stays art-first. */}
				<Divider my={48} />
				<Box maw={640} mx="auto" pb={48}>
					<Title order={3} ta="center" fw={600} mb="md">
						About Cassandra
					</Title>
					<Text ta="center" size="sm" style={{ lineHeight: 1.7 }}>
						Cassandra Wilcox is a Pittsburgh artist drawn to the things that make this city itself
						&mdash; the corner storefronts, the neon signs, the row houses climbing the hillsides
						of Polish Hill and the South Side Slopes. Neighborhood by neighborhood, she draws the
						landmarks and everyday details locals recognize in their bones. She sells original
						artwork and prints here, takes custom commissions, and shows her work at markets
						around Pittsburgh. Follow along on Instagram at{' '}
						<Anchor
							href="https://instagram.com/casswilcoxart"
							target="_blank"
							rel="noopener noreferrer"
						>
							@casswilcoxart
						</Anchor>
						.
					</Text>
				</Box>
			</Container>
		</>
	);
}

export const Component = Home;
