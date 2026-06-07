import { useEffect, useMemo, useState } from 'react';
import { useDocumentTitle } from '@mantine/hooks';
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
	Loader,
	Center,
} from '@mantine/core';
import { getArtworks } from '../lib/queries';
import { ArtworkCard } from '../components/ArtworkCard';
import { EventBanner } from '../components/EventBanner';
import { EmailSignupBanner } from '../components/EmailSignupBanner';
import type { ArtworkSummary } from '../types/artwork';

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
	useDocumentTitle('Cassandra Wilcox Art — Original Pittsburgh Art & Prints');
	const [artworks, setArtworks] = useState<ArtworkSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
	const [availableOnly, setAvailableOnly] = useState(false);

	useEffect(() => {
		getArtworks()
			.then(setArtworks)
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
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
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const filtered = artworks.filter((a) => {
		if (availableOnly && !isAvailable(a)) return false;
		if (activeTags.size === 0) return true;
		const tags = a.tags?.map((t) => t.toLowerCase()) ?? [];
		return [...activeTags].every((t) => tags.includes(t));
	});

	if (loading) {
		return (
			<Center py="xl">
				<Loader color="dark" />
			</Center>
		);
	}

	if (error) {
		return (
			<Container size="lg" py="xl">
				<Text c="red">Failed to load artworks: {error}</Text>
			</Container>
		);
	}

	if (artworks.length === 0) {
		return (
			<Container size="lg" py="xl">
				<Text c="dimmed">No artworks yet.</Text>
			</Container>
		);
	}

	return (
		<>
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
						<Button onClick={scrollToGallery} color="dark" radius={0} size="md" px="xl">
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
							onClick={() => setAvailableOnly((v) => !v)}
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
