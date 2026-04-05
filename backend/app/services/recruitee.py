"""Recruitee API client with comprehensive error handling."""

import httpx
import logging
from typing import Any

logger = logging.getLogger(__name__)

RECRUITEE_BASE_URL = "https://api.recruitee.com/c"
REQUEST_TIMEOUT = 30.0
MAX_RETRIES = 3


class RecruiteeAPIError(Exception):
    """Raised when Recruitee API returns an error."""

    def __init__(self, message: str, status_code: int | None = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class RecruiteeClient:
    def __init__(self, company_id: str, api_token: str):
        if not company_id or not company_id.strip():
            raise RecruiteeAPIError("Recruitee Company ID is not configured.")
        if not api_token or not api_token.strip():
            raise RecruiteeAPIError("Recruitee API token is not configured.")

        self.company_id = company_id.strip()
        self.api_token = api_token.strip()
        self.base_url = f"{RECRUITEE_BASE_URL}/{self.company_id}"
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }

    async def _request(self, method: str, path: str, **kwargs) -> Any:
        """Make an API request with retries and error handling."""
        url = f"{self.base_url}{path}"
        last_error = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                    response = await client.request(
                        method, url, headers=self.headers, **kwargs
                    )

                if response.status_code == 401:
                    raise RecruiteeAPIError(
                        "Invalid Recruitee API credentials. Please check your API token and Company ID.",
                        status_code=401,
                    )
                if response.status_code == 403:
                    raise RecruiteeAPIError(
                        "Access forbidden. Your API token may lack the required permissions.",
                        status_code=403,
                    )
                if response.status_code == 404:
                    raise RecruiteeAPIError(
                        f"Resource not found: {path}. Please verify your Company ID.",
                        status_code=404,
                    )
                if response.status_code == 429:
                    if attempt < MAX_RETRIES:
                        import asyncio
                        wait = 2 ** attempt
                        logger.warning(f"Rate limited by Recruitee API. Retrying in {wait}s (attempt {attempt}/{MAX_RETRIES})")
                        await asyncio.sleep(wait)
                        continue
                    raise RecruiteeAPIError(
                        "Recruitee API rate limit exceeded. Please try again later.",
                        status_code=429,
                    )
                if response.status_code >= 500:
                    if attempt < MAX_RETRIES:
                        import asyncio
                        wait = 2 ** attempt
                        logger.warning(f"Recruitee server error ({response.status_code}). Retrying in {wait}s")
                        await asyncio.sleep(wait)
                        continue
                    raise RecruiteeAPIError(
                        f"Recruitee API server error (HTTP {response.status_code}). Please try again later.",
                        status_code=response.status_code,
                    )

                response.raise_for_status()
                return response.json()

            except httpx.TimeoutException:
                last_error = RecruiteeAPIError(
                    f"Request to Recruitee API timed out after {REQUEST_TIMEOUT}s. "
                    "The service may be temporarily unavailable."
                )
                if attempt < MAX_RETRIES:
                    import asyncio
                    await asyncio.sleep(2 ** attempt)
                    continue
            except httpx.ConnectError:
                last_error = RecruiteeAPIError(
                    "Could not connect to Recruitee API. Please check your internet connection."
                )
                if attempt < MAX_RETRIES:
                    import asyncio
                    await asyncio.sleep(2 ** attempt)
                    continue
            except RecruiteeAPIError:
                raise
            except httpx.HTTPStatusError as e:
                raise RecruiteeAPIError(
                    f"Recruitee API returned HTTP {e.response.status_code}: {e.response.text}",
                    status_code=e.response.status_code,
                )
            except Exception as e:
                raise RecruiteeAPIError(f"Unexpected error communicating with Recruitee: {str(e)}")

        raise last_error

    async def list_offers(self) -> list[dict]:
        """Fetch all job offers."""
        data = await self._request("GET", "/offers")
        offers = data.get("offers", [])
        if not isinstance(offers, list):
            raise RecruiteeAPIError("Unexpected response format from Recruitee API: 'offers' is not a list.")
        return offers

    async def get_offer(self, offer_id: int) -> dict:
        """Fetch a single job offer."""
        if not isinstance(offer_id, int) or offer_id <= 0:
            raise RecruiteeAPIError(f"Invalid offer ID: {offer_id}")
        data = await self._request("GET", f"/offers/{offer_id}")
        return data.get("offer", data)

    async def list_candidates_for_offer(self, offer_id: int) -> list[dict]:
        """Fetch all candidates/placements for a specific offer."""
        if not isinstance(offer_id, int) or offer_id <= 0:
            raise RecruiteeAPIError(f"Invalid offer ID: {offer_id}")
        data = await self._request("GET", f"/offers/{offer_id}/placements")
        placements = data.get("placements", [])
        if not isinstance(placements, list):
            raise RecruiteeAPIError("Unexpected response format: 'placements' is not a list.")
        return placements

    async def get_candidate(self, candidate_id: int) -> dict:
        """Fetch a single candidate."""
        if not isinstance(candidate_id, int) or candidate_id <= 0:
            raise RecruiteeAPIError(f"Invalid candidate ID: {candidate_id}")
        data = await self._request("GET", f"/candidates/{candidate_id}")
        return data.get("candidate", data)

    async def move_candidate_stage(self, offer_id: int, placement_id: int, stage_id: int) -> dict:
        """Move a candidate to a different pipeline stage in Recruitee."""
        if not all(isinstance(x, int) and x > 0 for x in [offer_id, placement_id, stage_id]):
            raise RecruiteeAPIError("Invalid IDs provided for stage move.")
        data = await self._request(
            "PUT",
            f"/offers/{offer_id}/placements/{placement_id}",
            json={"placement": {"stage_id": stage_id}},
        )
        return data
