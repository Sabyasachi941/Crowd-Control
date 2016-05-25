package cc;

/**
 * Created by harryquigley on 20/04/2016.
 */
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

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
            if(venue == null){
                throw new UsernameNotFoundException("No user present with that email: "+ email);
            }
            else{
                List<String> userRoles = new ArrayList<String>();
                return new CustomUserDetails(venue, userRoles);
            }
        }
}
