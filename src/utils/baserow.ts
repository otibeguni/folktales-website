import {
  BASEROW_URL,
  BASEROW_TOKEN,
  BASEROW_DATABASE_ID,
} from 'astro:env/server';
import type { MetadataItem } from '@/types';

type RowData = {
  count: number;
  next: string | null;
  previous: string | null;
  results: MetadataItem[];
};

/**
 * Fetches all rows from a Baserow database with the given ID.
 * @param databaseId The ID of the Baserow database to fetch rows from.
 * If not provided, the default value of `BASEROW_DATABASE_ID` is used.
 * @returns A promise that resolves to the row data from Baserow.
 * @throws An error if the HTTP response was not OK.
 */
export async function fetchRowsByDatabaseId(
  databaseId: string = BASEROW_DATABASE_ID,
): Promise<RowData> {
  const url = `${BASEROW_URL}/api/database/rows/table/${databaseId}/?user_field_names=true`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Token ${BASEROW_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}
