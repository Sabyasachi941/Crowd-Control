package cc;

/**
 * Created by harryquigley on 01/04/2016.
 */
import cc.Venue;
import cc.VenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class VenueServiceImpl implements VenueService {
    private VenueRepository venueRepository;

    @Autowired
    public void setVenueRepository(VenueRepository venueRepository) {
        this.venueRepository = venueRepository;
    }

    @Override
    public Iterable<Venue> listAllVenues() {
        return venueRepository.findAll();
    }

    @Override
    public Venue getVenueById(Integer id) {
        return venueRepository.findOne(id);
    }


    @Override
    public Venue saveVenue(Venue venue) {
        return venueRepository.save(venue);
    }

    @Override
    public void deleteVenue(Integer id) {
        venueRepository.delete(id);
    }
}
