package cc;

/**
 * Created by harryquigley on 16/03/2016.
 */
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;
import org.springframework.data.repository.query.Param;
import org.springframework.data.repository.CrudRepository;
import cc.Venue;


public interface VenueRepository extends PagingAndSortingRepository<Venue, Integer> {
    Venue findByEmail(String email);
    List <Venue> findListByEmail(String email);

}


