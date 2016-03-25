package cc;

/**
 * Created by harryquigley on 16/03/2016.
 */
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;
import org.springframework.data.repository.query.Param;


@RepositoryRestResource(collectionResourceRel = "venues", path = "venues")
public interface VenueRepository extends PagingAndSortingRepository<Venue, Long> {
    List<Venue> findBycapacity(@Param("capacity") Boolean capacity);
}


