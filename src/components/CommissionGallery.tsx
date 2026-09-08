import { useEffect, useState } from "react";
import { ActionIcon, Box, Image, Modal, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";

export interface CommissionExample {
  /** Path under /public, e.g. "/images/commissions/didi-home.jpg". */
  src: string;
  /** Descriptive alt text for accessibility. */
  alt: string;
  /** Short caption shown under the image. */
  caption: string;
}

// Real past commissions, shown to convey range and quality. Clicking opens a
// lightbox rather than a new page — the work is worth seeing large, but the
// visitor never leaves the page whose one job is to move them to the form.
export function CommissionGallery({ examples }: { examples: CommissionExample[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = () => setOpenIndex(null);
  // Index math lives inside the updater so the effect below needs no extra deps.
  const step = (delta: number) =>
    setOpenIndex((i) => (i === null ? i : (i + delta + examples.length) % examples.length));

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex, examples.length]);

  if (examples.length === 0) return null;

  const active = openIndex === null ? null : examples[openIndex];

  return (
    <>
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="lg">
        {examples.map((ex, idx) => (
          <Stack key={ex.src} gap={6}>
            <UnstyledButton
              onClick={() => setOpenIndex(idx)}
              aria-label={`View larger: ${ex.caption}`}
              style={{ display: "block" }}
            >
              <Image
                src={ex.src}
                alt={ex.alt}
                loading="lazy"
                radius="sm"
                style={{
                  aspectRatio: "1 / 1",
                  objectFit: "cover",
                  objectPosition: "center",
                  boxShadow: "var(--mantine-shadow-sm)",
                  cursor: "zoom-in",
                }}
              />
            </UnstyledButton>
            <Box>
              <Text size="sm" c="dimmed">
                {ex.caption}
              </Text>
            </Box>
          </Stack>
        ))}
      </SimpleGrid>

      <Modal
        opened={openIndex !== null}
        onClose={close}
        size="auto"
        centered
        padding={0}
        withCloseButton={false}
        radius={0}
        overlayProps={{ backgroundOpacity: 0.85, blur: 2 }}
        styles={{ content: { background: "transparent", boxShadow: "none" } }}
      >
        {active && (
          <Stack gap="xs" align="center">
            <Box style={{ position: "relative", display: "flex", justifyContent: "center" }}>
              {/* Uncropped here — the grid square-crops, but the lightbox is
                  where the whole piece should finally be visible. */}
              <Image
                src={active.src}
                alt={active.alt}
                fit="contain"
                radius={0}
                style={{ maxHeight: "85vh", maxWidth: "90vw", cursor: "zoom-out" }}
                onClick={close}
              />

              {examples.length > 1 && (
                <>
                  <ActionIcon
                    variant="filled"
                    color="dark"
                    radius="xl"
                    size="lg"
                    onClick={() => step(-1)}
                    aria-label="Previous commission"
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  >
                    ‹
                  </ActionIcon>
                  <ActionIcon
                    variant="filled"
                    color="dark"
                    radius="xl"
                    size="lg"
                    onClick={() => step(1)}
                    aria-label="Next commission"
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  >
                    ›
                  </ActionIcon>
                </>
              )}

              <ActionIcon
                variant="filled"
                color="dark"
                radius="xl"
                size="lg"
                onClick={close}
                aria-label="Close"
                style={{ position: "absolute", top: 12, right: 12 }}
              >
                ×
              </ActionIcon>
            </Box>
            <Text size="sm" c="white" ta="center">
              {active.caption}
            </Text>
          </Stack>
        )}
      </Modal>
    </>
  );
}
