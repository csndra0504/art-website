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
import { SeoHead } from '../components/SeoHead';
import { JsonLd } from '../components/JsonLd';
import { buildHomeJsonLd } from '../lib/structuredData';
import { isAvailable, shelfProduct, type Shelf } from '../lib/offers';
import type { ArtworkSummary } from '../types/artwork';

// Runs at build time (and on client navigation) so the gallery is present in the
// static HTML for crawlers.
export async function loader() {
	return { artworks: await getArtworks() };
}

// "Available" — for sale with at least one purchase path open — is decided in
// lib/offers so the filter and the cards can't disagree about it.

const NEW_COUNT = 6;
// Fewer than this and a "Just added" strip looks like a mistake, not a feature.
const NEW_MIN = 3;

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
	const [shelf, setShelf] = useState<Shelf | null>(null);

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

	// "Shop by" chips. A chip only appears when something is on its shelf, so
	// "Magnets" can't lead to an empty page. Stickers join the magnets shelf
	// (and its label) as soon as a sticker product is published.
	const shelves = useMemo(() => {
		const hasStickers = artworks.some((a) => a.products?.some((p) => p.kind === 'sticker'));
		const all: { key: Shelf; label: string }[] = [
			{ key: 'under25', label: 'Under $25' },
			{ key: 'magnets', label: hasStickers ? 'Magnets & Stickers' : 'Magnets' },
			{ key: 'prints', label: 'Prints' },
			{ key: 'originals', label: 'Originals' },
		];
		return all.filter((s) => artworks.some((a) => shelfProduct(a, s.key)));
	}, [artworks]);

	// Newest pieces still for sale. By creation date rather than a time window:
	// the prerendered HTML and the client would disagree about "last 30 days"
	// whenever a build is old, and a small shop's newest work is its news anyway.
	const justAdded = useMemo(
		() =>
			artworks
				.filter(isAvailable)
				.sort((a, b) => (b._createdAt ?? '').localeCompare(a._createdAt ?? ''))
				.slice(0, NEW_COUNT),
		[artworks],
	);

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
		if (shelf && !shelfProduct(a, shelf)) return false;
		if (activeTags.size === 0) return true;
		const tags = a.tags?.map((t) => t.toLowerCase()) ?? [];
		return [...activeTags].every((t) => tags.includes(t));
	});

	const seo = (
		<>
			<SeoHead
				title="Cassandra Wilcox Art | Original Pittsburgh Art & Prints"
				description="Hand-drawn originals and prints of Pittsburgh's landmarks and main-street neighborhoods: Lawrenceville, Polish Hill, the South Side, and beyond. By Pittsburgh sketch artist Cassandra Wilcox."
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
			<Container size="lg">
				{/* Hero — lead with the work and a clear path to buy. */}
				<Stack align="center" py={{ base: 28, sm: 48 }} gap="md">
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
							Shop Originals, Prints &amp; Magnets
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

				{/* Newest work first. Always shown (not hidden by filters) so the
				    page doesn't jump when a chip is tapped. Scrolls sideways on
				    phones rather than adding a screen of extra grid. */}
				{justAdded.length >= NEW_MIN && (
					<Box mb="xl">
						<Title order={3} fw={600} size="h4" mb="sm">
							Just added
						</Title>
						<Box
							style={{
								display: 'flex',
								gap: 12,
								overflowX: 'auto',
								scrollSnapType: 'x proximity',
								paddingBottom: 8,
							}}
						>
							{justAdded.map((artwork) => (
								<Box
									key={artwork._id}
									w={{ base: 160, sm: 200 }}
									style={{ flex: '0 0 auto', scrollSnapAlign: 'start' }}
								>
									<ArtworkCard artwork={artwork} isNew />
								</Box>
							))}
						</Box>
					</Box>
				)}

				{/* Filters: All, then For Sale, then shop-by shelves, then tags. */}
				<Group gap="xs" mb="lg">
					<Badge
						variant={activeTags.size === 0 && !availableOnly && !shelf ? 'filled' : 'outline'}
						color="dark"
						radius={0}
						size="md"
						style={{ cursor: 'pointer' }}
						onClick={() => {
							setActiveTags(new Set());
							setAvailableOnly(false);
							setShelf(null);
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
					{shelves.map((s) => (
						<Badge
							key={s.key}
							variant={shelf === s.key ? 'filled' : 'outline'}
							color="brick.6"
							radius={0}
							size="md"
							style={{ cursor: 'pointer' }}
							onClick={() => {
								const next = shelf === s.key ? null : s.key;
								setShelf(next);
								posthog?.capture('gallery_filter_applied', {
									filter_type: 'shelf',
									filter_value: s.key,
									applied: next !== null,
								});
							}}
						>
							{s.label}
						</Badge>
					))}
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
					// Two-up on phones (most of the traffic) so four pieces are on screen
					// at once instead of one, stepping up to four across on desktop.
					<SimpleGrid
						cols={{ base: 2, sm: 3, md: 4 }}
						spacing={{ base: 'xs', sm: 'lg' }}
						verticalSpacing={{ base: 'md', sm: 'lg' }}
					>
						{filtered.map((artwork) => (
							<ArtworkCard
								key={artwork._id}
								artwork={artwork}
								focus={shelf ? shelfProduct(artwork, shelf) : undefined}
							/>
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
						Cassandra Wilcox is a Pittsburgh artist drawn to the things that make this city itself:
						the corner storefronts, the neon signs, the row houses climbing the hillsides
						of Polish Hill and the South Side Slopes. Neighborhood by neighborhood, she draws the
						landmarks and everyday details locals recognize in their bones. She sells original
						artwork, prints, and magnets here, takes custom commissions, and shows her work at markets
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
