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
import org.joda.time.DateTime;

//don't think below line is needed!
@RepositoryRestResource(collectionResourceRel = "timestamps", path = "timestamps")
public interface TimestampRepository extends PagingAndSortingRepository<Timestamp, Integer> {
    Integer findByInDay(Venue v,DateTime startDay, DateTime endDay);
}
