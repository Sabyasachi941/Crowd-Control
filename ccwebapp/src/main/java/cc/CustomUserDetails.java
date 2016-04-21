package cc;

/**
 * Created by harryquigley on 20/04/2016.
 */
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StringUtils;
import cc.Venue;
import java.util.*;

public class CustomUserDetails extends cc.Venue implements UserDetails {
    //private static final long serialVersionUID = 1L;
    private List<String> userRoles;

    public CustomUserDetails(Venue venue, List<String> userRoles){
        super(venue);
        this.userRoles = userRoles;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return new HashSet<GrantedAuthority>();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @Override
    public String getUsername() {
        return super.getEmail();
    }
}
