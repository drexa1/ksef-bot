interface NominatimResponse {
    address?: {
        city?: string
        town?: string
        village?: string
        municipality?: string
        postcode?: string
    };
}

export async function getCurrentLocation(language = "pl"): Promise<{
    city?: string
    town?: string
    village?: string
    municipality?: string
    postcode?: string
}> {
    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
    );
    const { latitude, longitude } = position.coords;
    const response = await fetch( `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=${language}`);
    if (!response.ok)
        throw new Error("Failed to determine city");
    const result = await response.json() as NominatimResponse;
    return {
        city: result.address?.city,
        town: result.address?.town,
        village: result.address?.village,
        municipality: result.address?.municipality,
        postcode: result.address?.postcode
    };
}