package cc;

/**
 * Created by harryquigley on 01/04/2016.
 */



import cc.Venue;
import java.util.List;

public interface VenueService {
    Iterable<Venue> listAllVenues();

    Venue getVenueById(Integer id);

    Venue saveVenue(Venue venue);

    void deleteVenue(Integer id);

}