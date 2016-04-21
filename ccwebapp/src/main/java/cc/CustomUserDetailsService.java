package cc;

/**
 * Created by harryquigley on 20/04/2016.
 */
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

import cc.Venue;
import cc.VenueRepository;

@Service("customUserDetailsService")
public class CustomUserDetailsService implements UserDetailsService{
    private final VenueRepository venueRepository;

    @Autowired
        public CustomUserDetailsService(VenueRepository venueRepository) {
            this.venueRepository = venueRepository;
        }

    @Override
        public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
            Venue venue=venueRepository.findByEmail(email);
            if(null == venue){
                throw new UsernameNotFoundException("No user present with that email: "+ email);
            }
            else{
                List<String> userRoles = new ArrayList<String>();
                return new CustomUserDetails(venue, userRoles);
            }
        }
}
